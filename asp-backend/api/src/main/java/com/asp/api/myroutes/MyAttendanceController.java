package com.asp.api.myroutes;

import com.asp.api.auth.Roles;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The staff app records what happens to a kid on a route:
 *
 *   POST /my/routes/{routeId}/kids/{studentId}/check-in   the kid was picked up
 *   POST /my/routes/{routeId}/kids/{studentId}/absent     the kid was not there
 *
 * Both do EVERYTHING in one step (one transaction): the attendance of the kid on that route and
 * the news for the family ("Picked up from school" / "Marked as absent"). The app no longer has
 * to make several calls. The push notification to the parents comes with the push service.
 *
 * Who may do it: the person responsible for the kid on that route, or the driver of the van.
 * Only while the route is waiting to start or in progress.
 */
@RestController
@RequestMapping("/my/routes/{routeId}/kids/{studentId}")
public class MyAttendanceController {

    private static final Set<String> OPEN = Set.of("waiting_to_start", "in_progress");

    private static final String CHECK_IN_UPDATE =
        "update student_attendance set checked_in = true, checked_in_at = now(), checked_in_by = ?, "
            + "is_absent = false, absent_at = null, absent_by = null, van_id = ? where id = ?";
    private static final String ABSENT_UPDATE =
        "update student_attendance set is_absent = true, absent_at = now(), absent_by = ?, "
            + "checked_in = false, checked_in_at = null, checked_in_by = null, van_id = ? where id = ?";
    private static final String CHECK_IN_INSERT =
        "insert into student_attendance (student_id, route_id, van_id, date, checked_in, checked_in_at, "
            + "checked_in_by) values (?, ?, ?, ?, true, now(), ?)";
    private static final String ABSENT_INSERT =
        "insert into student_attendance (student_id, route_id, van_id, date, is_absent, absent_at, "
            + "absent_by) values (?, ?, ?, ?, true, now(), ?)";

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final String timezone;

    public MyAttendanceController(JdbcTemplate jdbc, TransactionTemplate transaction,
                                  @Value("${app.timezone:America/Vancouver}") String timezone) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.timezone = timezone;
    }

    @PostMapping("/check-in")
    public Map<String, Object> checkIn(@PathVariable UUID routeId, @PathVariable UUID studentId,
                                       Authentication auth) {
        return record(routeId, studentId, auth, true);
    }

    @PostMapping("/absent")
    public Map<String, Object> absent(@PathVariable UUID routeId, @PathVariable UUID studentId,
                                      Authentication auth) {
        return record(routeId, studentId, auth, false);
    }

    private Map<String, Object> record(UUID routeId, UUID studentId, Authentication auth, boolean checkIn) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());

        return transaction.execute(txStatus -> {
            // Where is this kid on this route, and who is in charge of the kid?
            List<Map<String, Object>> stops = jdbc.queryForList(
                "select r.date, r.status, rv.van_id, rv.driver_id, rs.responsible_staff_id "
                    + "from routes r "
                    + "join route_vans rv on rv.route_id = r.id "
                    + "join route_stops rs on rs.route_van_id = rv.id "
                    + "where r.id = ? and rs.student_id = ?",
                routeId, studentId);
            if (stops.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This kid is not on this route");
            }
            Map<String, Object> stop = stops.get(0);

            String routeStatus = String.valueOf(stop.get("status"));
            if (!OPEN.contains(routeStatus)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is " + routeStatus + ": the attendance cannot be recorded");
            }
            if (!me.equals(stop.get("responsible_staff_id")) && !me.equals(stop.get("driver_id"))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the person responsible for this kid, or the driver, can record the attendance");
            }

            // One attendance row per kid and route
            List<Map<String, Object>> existing = jdbc.queryForList(
                "select id, checked_in, is_absent from student_attendance "
                    + "where student_id = ? and route_id = ? for update",
                studentId, routeId);

            if (existing.isEmpty()) {
                jdbc.update(checkIn ? CHECK_IN_INSERT : ABSENT_INSERT,
                    studentId, routeId, stop.get("van_id"), stop.get("date"), me);
            } else {
                Map<String, Object> row = existing.get(0);
                boolean alreadyThere = Boolean.TRUE.equals(row.get(checkIn ? "checked_in" : "is_absent"));
                if (alreadyThere) {
                    return status("unchanged"); // the same thing was recorded before: nothing to repeat
                }
                jdbc.update(checkIn ? CHECK_IN_UPDATE : ABSENT_UPDATE, me, stop.get("van_id"), row.get("id"));
            }

            // The news for the family
            jdbc.update(
                "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", notes) "
                    + "values (CAST('ATTENDANCE' AS feed_type), (now() at time zone CAST(? AS text)), ?, "
                    + "'has a new Attendance', ?, ?)",
                timezone, studentId, me, checkIn ? "Picked up from school" : "Marked as absent");

            return status(checkIn ? "checked_in" : "absent");
        });
    }

    private static Map<String, Object> status(String value) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", value);
        return body;
    }
}
