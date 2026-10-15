package com.asp.api.planner;

import com.asp.api.auth.Roles;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The pickup planner.
 *
 *   GET  /planner/roster                  who can drive, help or be responsible (active staff, drivers, admins)
 *   GET  /planner/pickup/{date}           the saved route of a day: route, vans and stops, in ONE answer
 *   PUT  /planner/pickup/{date}           save the whole plan in ONE transaction (all or nothing)
 *   POST /planner/pickup/{date}/send      check the plan and lock it ("waiting_to_start")
 *   POST /planner/pickup/{date}/reopen    unlock it again (only while it has not started)
 *
 * Saving REPLACES the plan: a van that is no longer in the plan (or has no kids) is removed with its
 * stops. A route that was sent, started or finished cannot be saved over.
 */
@RestController
@RequestMapping("/planner")
public class PlannerController {

    // The only statuses in which the plan can still be edited
    private static final Set<String> EDITABLE = Set.of("not_started", "planning");

    // ---- request bodies (the names of the JSON fields are the column names the dashboard already uses)
    public record PlanRequest(List<UUID> absents, List<VanPlan> vans) {}

    public record VanPlan(@JsonProperty("van_id") UUID vanId,
                          @JsonProperty("driver_id") UUID driverId,
                          @JsonProperty("helper_ids") List<UUID> helperIds,
                          @JsonProperty("school_order") List<String> schoolOrder,
                          @JsonProperty("total_eta") Integer totalEta,
                          @JsonProperty("total_people") Integer totalPeople,
                          List<StopPlan> stops) {}

    public record StopPlan(@JsonProperty("student_id") UUID studentId,
                           @JsonProperty("responsible_staff_id") UUID responsibleStaffId) {}

    // The whole route of a day as one JSON document. The stops carry the student (with the school)
    // and the responsible staff member in the same shape the planner already reads.
    private static final String ROUTE_DOCUMENT_SQL = """
        select jsonb_build_object(
          'route', (select to_jsonb(r) from routes r
                    where r.date = CAST(? AS date) and r.type = 'pickup' limit 1),
          'vans', coalesce((
            select jsonb_agg(to_jsonb(rv) order by rv.created_at)
            from route_vans rv join routes r on r.id = rv.route_id
            where r.date = CAST(? AS date) and r.type = 'pickup'), '[]'::jsonb),
          'stops', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', rs.id,
                'route_van_id', rs.route_van_id,
                'student_id', rs.student_id,
                'responsible_staff_id', rs.responsible_staff_id,
                'stop_order', rs.stop_order,
                'students', to_jsonb(s) || jsonb_build_object('schools', to_jsonb(sc)),
                'users', case when u.id is null then null
                              else jsonb_build_object('id', u.id, 'name', u.name) end
              ) order by rs.stop_order)
            from route_stops rs
            join route_vans rv on rv.id = rs.route_van_id
            join routes r on r.id = rv.route_id
            join students s on s.id = rs.student_id
            left join schools sc on sc.id = s."schoolId"
            left join users u on u.id = rs.responsible_staff_id
            where r.date = CAST(? AS date) and r.type = 'pickup'), '[]'::jsonb)
        )::text
        """;

    private static final String UPSERT_ROUTE_VAN_SQL = """
        insert into route_vans (route_id, van_id, driver_id, helper_ids, school_order, total_eta, total_people)
        values (?, ?, CAST(? AS uuid), CAST(? AS uuid[]), CAST(? AS uuid[]), CAST(? AS integer), CAST(? AS integer))
        on conflict (route_id, van_id) do update set
          driver_id = excluded.driver_id,
          helper_ids = excluded.helper_ids,
          school_order = excluded.school_order,
          total_eta = excluded.total_eta,
          total_people = excluded.total_people
        returning id
        """;

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;

    public PlannerController(JdbcTemplate jdbc, TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.transaction = transaction;
    }

    // ------------------------------------------------------------------ roster

    @GetMapping("/roster")
    public List<Map<String, Object>> roster(Authentication auth) {
        Roles.requireManager(auth);
        return jdbc.queryForList(
            "select id, name, \"userType\" from users "
                + "where active and lower(coalesce(\"userType\", '')) in ('staff', 'driver', 'admin') "
                + "order by lower(name)");
    }

    // ------------------------------------------------------------------ read

    // route is null when nothing was saved for that day
    @GetMapping("/pickup/{date}")
    public ResponseEntity<String> get(@PathVariable String date, Authentication auth) {
        Roles.requireManager(auth);
        String day = parseDate(date).toString();
        String json = jdbc.queryForObject(ROUTE_DOCUMENT_SQL, String.class, day, day, day);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
    }

    // ------------------------------------------------------------------ save

    @PutMapping("/pickup/{date}")
    public Map<String, Object> save(@PathVariable String date, @RequestBody PlanRequest body, Authentication auth) {
        Roles.requireManager(auth);
        LocalDate day = parseDate(date);
        UUID userId = UUID.fromString(auth.getName());

        List<UUID> absents = body.absents() == null ? List.of() : body.absents();
        List<VanPlan> vans = body.vans() == null ? List.of() : body.vans();
        validatePlan(absents, vans);

        return transaction.execute(status -> persist(day, userId, absents, vans));
    }

    // Everything that can be wrong with the plan itself (400), before anything is written
    private void validatePlan(List<UUID> absents, List<VanPlan> vans) {
        Set<UUID> vanIds = new HashSet<>();
        Set<UUID> studentIds = new HashSet<>();
        Set<UUID> staffIds = new HashSet<>();

        for (VanPlan van : vans) {
            if (van.vanId() == null || !vanIds.add(van.vanId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each van can appear only once");
            }
            if (van.driverId() != null) {
                staffIds.add(van.driverId());
            }
            if (van.helperIds() != null) {
                staffIds.addAll(van.helperIds());
            }
            for (StopPlan stop : van.stops() == null ? List.<StopPlan>of() : van.stops()) {
                if (stop.studentId() == null || !studentIds.add(stop.studentId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A student can be in only one van");
                }
                if (stop.responsibleStaffId() != null) {
                    staffIds.add(stop.responsibleStaffId());
                }
            }
        }
        for (UUID absent : absents) {
            if (studentIds.contains(absent)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A student cannot be absent and in a van at the same time");
            }
        }

        // Only vans that exist and are active
        if (!vanIds.isEmpty() && count("select count(*) from vans where id = any(CAST(? AS uuid[])) and active",
                vanIds) != vanIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A van is unknown or inactive");
        }
        // Only students that exist and are not archived
        if (!studentIds.isEmpty() && count("select count(*) from students where id = any(CAST(? AS uuid[])) "
                + "and coalesce(status, 'Active') <> 'Inactive'", studentIds) != studentIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A student is unknown or inactive");
        }
        // Only people who can work in a route (active staff, drivers and admins)
        if (!staffIds.isEmpty() && count("select count(*) from users where id = any(CAST(? AS uuid[])) and active "
                + "and lower(coalesce(\"userType\", '')) in ('staff', 'driver', 'admin')", staffIds) != staffIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A staff member is unknown or inactive");
        }
    }

    private int count(String sql, Set<UUID> ids) {
        Integer n = jdbc.queryForObject(sql, Integer.class, uuidArray(ids));
        return n == null ? 0 : n;
    }

    // Runs inside the transaction
    private Map<String, Object> persist(LocalDate day, UUID userId, List<UUID> absents, List<VanPlan> vans) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, status from routes where date = CAST(? AS date) and type = 'pickup' for update",
            day.toString());

        UUID routeId;
        if (rows.isEmpty()) {
            routeId = jdbc.queryForObject(
                "insert into routes (date, type, status, absents, created_by) "
                    + "values (CAST(? AS date), 'pickup', 'planning', CAST(? AS uuid[]), ?) returning id",
                UUID.class, day.toString(), uuidArray(absents), userId);
        } else {
            routeId = (UUID) rows.get(0).get("id");
            String status = String.valueOf(rows.get(0).get("status"));
            if (!EDITABLE.contains(status)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is " + status + " and cannot be changed. Re-open it first.");
            }
            jdbc.update("update routes set absents = CAST(? AS uuid[]), status = 'planning' where id = ?",
                uuidArray(absents), routeId);
        }

        // The plan REPLACES what was saved: the vans of the plan are written, the others are removed
        Set<UUID> kept = new HashSet<>();
        for (VanPlan van : vans) {
            List<StopPlan> stops = van.stops() == null ? List.of() : van.stops();
            if (stops.isEmpty()) {
                continue; // a van without kids is not part of the route
            }

            UUID routeVanId = jdbc.queryForObject(UPSERT_ROUTE_VAN_SQL, UUID.class,
                routeId, van.vanId(), van.driverId(),
                uuidArray(van.helperIds() == null ? List.of() : van.helperIds()),
                uuidArray(onlyUuids(van.schoolOrder())),
                van.totalEta(), van.totalPeople());
            kept.add(routeVanId);

            jdbc.update("delete from route_stops where route_van_id = ?", routeVanId);
            int order = 0;
            for (StopPlan stop : stops) {
                jdbc.update(
                    "insert into route_stops (route_van_id, student_id, responsible_staff_id, stop_order) "
                        + "values (?, ?, CAST(? AS uuid), ?)",
                    routeVanId, stop.studentId(), stop.responsibleStaffId(), order++);
            }
        }

        // Vans that left the plan (removed, or emptied) go away with their stops (cascade)
        for (UUID existing : jdbc.queryForList("select id from route_vans where route_id = ?", UUID.class, routeId)) {
            if (!kept.contains(existing)) {
                jdbc.update("delete from route_vans where id = ?", existing);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", routeId);
        result.put("status", "planning");
        result.put("vans", kept.size());
        return result;
    }

    // ------------------------------------------------------------------ send

    // 409 { error, reasons: [...] } when the plan is not ready
    @PostMapping("/pickup/{date}/send")
    public ResponseEntity<Map<String, Object>> send(@PathVariable String date, Authentication auth) {
        Roles.requireManager(auth);
        LocalDate day = parseDate(date);
        return transaction.execute(status -> doSend(day));
    }

    private ResponseEntity<Map<String, Object>> doSend(LocalDate day) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, status from routes where date = CAST(? AS date) and type = 'pickup' for update",
            day.toString());
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "There is no saved route for this date");
        }
        UUID routeId = (UUID) rows.get(0).get("id");
        String status = String.valueOf(rows.get(0).get("status"));
        if (!status.equals("planning")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This route is " + status + ", it cannot be sent");
        }

        List<String> reasons = new ArrayList<>();

        // 1) Every kid of the day is on a van or absent
        String dayColumn = switch (day.getDayOfWeek()) {
            case MONDAY -> "monday";
            case TUESDAY -> "tuesday";
            case WEDNESDAY -> "wednesday";
            case THURSDAY -> "thursday";
            case FRIDAY -> "friday";
            default -> null;
        };
        if (dayColumn != null) {
            List<String> remaining = jdbc.queryForList(
                "select s.name from students s join students_schedule ss on ss.\"studentId\" = s.id "
                    + "where coalesce(s.status, 'Active') <> 'Inactive' and ss." + dayColumn + " = true "
                    + "and s.id not in (select rs.student_id from route_stops rs "
                    + "join route_vans rv on rv.id = rs.route_van_id where rv.route_id = ?) "
                    + "and s.id not in (select unnest(r.absents) from routes r where r.id = ?) "
                    + "order by s.name",
                String.class, routeId, routeId);
            if (!remaining.isEmpty()) {
                String shown = remaining.stream().limit(8).collect(Collectors.joining(", "));
                String more = remaining.size() > 8 ? " and " + (remaining.size() - 8) + " more" : "";
                reasons.add(remaining.size() + " kid(s) are not on a van or absent: " + shown + more + ".");
            }
        }

        // 2) Every van of the route has a driver
        for (String van : jdbc.queryForList(
            "select coalesce(v.name, 'A van') from route_vans rv join vans v on v.id = rv.van_id "
                + "where rv.route_id = ? and rv.driver_id is null order by v.name",
            String.class, routeId)) {
            reasons.add(van + " has no driver.");
        }

        // 3) Every school of every van has someone responsible
        for (Map<String, Object> row : jdbc.queryForList(
            "select coalesce(v.name, 'A van') as van, coalesce(sc.name, 'No school') as school "
                + "from route_stops rs "
                + "join route_vans rv on rv.id = rs.route_van_id "
                + "join vans v on v.id = rv.van_id "
                + "join students s on s.id = rs.student_id "
                + "left join schools sc on sc.id = s.\"schoolId\" "
                + "where rv.route_id = ? "
                + "group by rv.id, v.name, sc.id, sc.name "
                + "having bool_and(rs.responsible_staff_id is null) "
                + "order by v.name, sc.name",
            routeId)) {
            reasons.add(row.get("van") + ": nobody is responsible for " + row.get("school") + ".");
        }

        if (!reasons.isEmpty()) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "This route is not ready to be sent.");
            error.put("reasons", reasons);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        jdbc.update("update routes set status = 'waiting_to_start', sent_at = now() where id = ?", routeId);
        Map<String, Object> ok = new LinkedHashMap<>();
        ok.put("status", "waiting_to_start");
        return ResponseEntity.ok(ok);
    }

    // ------------------------------------------------------------------ reopen

    @PostMapping("/pickup/{date}/reopen")
    public Map<String, Object> reopen(@PathVariable String date, Authentication auth) {
        Roles.requireManager(auth);
        LocalDate day = parseDate(date);

        return transaction.execute(txStatus -> {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "select id, status from routes where date = CAST(? AS date) and type = 'pickup' for update",
                day.toString());
            if (rows.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "There is no saved route for this date");
            }
            String status = String.valueOf(rows.get(0).get("status"));
            if (status.equals("waiting_to_start")) {
                jdbc.update("update routes set status = 'planning' where id = ?", rows.get(0).get("id"));
            } else if (!status.equals("planning")) {
                // in progress, finished...: the vans may already be on the road
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is " + status + " and cannot be re-opened");
            }
            Map<String, Object> ok = new LinkedHashMap<>();
            ok.put("status", "planning");
            return ok;
        });
    }

    // ------------------------------------------------------------------ helpers

    private static LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The date must look like 2026-10-14");
        }
    }

    // PostgreSQL array literal {a,b,c}. Every item is a parsed UUID, so nothing else can get in.
    private static String uuidArray(java.util.Collection<UUID> ids) {
        return "{" + ids.stream().map(UUID::toString).collect(Collectors.joining(",")) + "}";
    }

    // The planner uses "no-school" for kids without a school: that is not an id, so it is left out
    private static List<UUID> onlyUuids(List<String> values) {
        List<UUID> ids = new ArrayList<>();
        if (values == null) {
            return ids;
        }
        for (String value : values) {
            try {
                ids.add(UUID.fromString(value));
            } catch (IllegalArgumentException e) {
                // not an id: skip it
            }
        }
        return ids;
    }
}
