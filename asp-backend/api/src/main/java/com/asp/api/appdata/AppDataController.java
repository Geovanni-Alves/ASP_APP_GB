package com.asp.api.appdata;

import com.asp.api.auth.Roles;
import com.asp.api.audit.AuditService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * What the staff app reads and writes every day: the team, the kids, the feed and the chat.
 * Every route is for people who may use the staff app (staff, drivers, admins), not only managers.
 * The routes of the day are in MyRoutesController, the check-in in MyAttendanceController.
 *
 *   GET  /app/staff                       the team (names, photos, phones)
 *   GET  /app/settings                    the start of the routes and the name of the program
 *   GET  /app/today                       who is at the school today (checked in, absent, expected, not today)
 *   POST /app/students/{id}/here          a kid arrived without a route (a parent brought the kid): marks the kid as here
 *   POST /app/students/{id}/checkout      a parent picked the kid up at the ASP: the kid went home
 *   GET  /app/students/{id}/day           who registered the check-in, check-out and absence today (owner, manager, programmer)
 *   POST /app/students/{id}/revert        undo a check-in, check-out or absence made by mistake today (owner, manager, programmer)
 *   GET  /app/students                    the kids that are not archived, with school, family, address
 *   GET  /app/students/{id}               one kid
 *   POST /app/students/{id}/dismissal-photos   add a photo of the dismissal door (owner, manager, admin)
 *   GET  /app/feeds?days=30&afterId=      the feed (news about the kids)
 *   POST /app/feeds                       a new feed item (photo, video, activity...)
 *   POST /app/feeds/bulk                  the same item for many kids at once, one item per kid with all the photos
 *                                         stacked in it (all or nothing)
 *   GET  /app/messages/unread             messages from the families that nobody read yet
 *   GET  /app/messages?studentId=&limit=  the conversation about a kid (newest first)
 *   POST /app/messages                    a new message to the family
 *   POST /app/messages/read               marks the family's messages of one kid as read
 *
 * The push notifications to the families come with the push service of the API (a later step).
 */
@RestController
@RequestMapping("/app")
public class AppDataController {

    private static final Pattern SAFE_FILE_NAME = Pattern.compile("^[A-Za-z0-9._-]{1,200}$");

    private static final Set<String> FEED_TYPES =
        Set.of("ATTENDANCE", "PHOTO", "PROMOTION", "ACTIVITY", "VIDEO", "INCIDENT");

    // A kid that is not archived
    private static final String ACTIVE_KID = "coalesce(s.status, 'Active') <> 'Inactive'";

    // The message was written by the family (a contact, or a user who is not part of the team)
    private static final String FROM_FAMILY =
        "(m.sender_contact_id is not null or not exists (select 1 from users su "
            + "where su.id = m.sender_user_id "
            + "and lower(coalesce(su.\"userType\", '')) in ('staff', 'driver', 'admin', 'manager', 'owner', 'superadmin')))";

    // One kid with everything the screens use. The invite code of a contact never goes out.
    private static final String STUDENT_SELECT = """
        select s.*,
          (select to_jsonb(sc) from schools sc where sc.id = s."schoolId") as schools,
          (select to_jsonb(r) from drop_off_route r where r.id = s."dropOffRouteId") as drop_off_route,
          coalesce((
            select jsonb_agg(to_jsonb(c) - 'code' order by c."firstName")
            from student_family sf join contacts c on c.id = sf.contact_id
            where sf.student_id = s.id), '[]'::jsonb) as contacts,
          coalesce((
            select jsonb_agg(jsonb_build_object('contact', to_jsonb(c) - 'code', 'is_primary', sf.is_primary))
            from student_family sf join contacts c on c.id = sf.contact_id
            where sf.student_id = s.id), '[]'::jsonb) as student_family,
          coalesce((
            select jsonb_agg(to_jsonb(ss)) from students_schedule ss where ss."studentId" = s.id),
            '[]'::jsonb) as students_schedule,
          coalesce((
            select jsonb_agg(to_jsonb(a) order by coalesce(a."isDefault", false) desc, a.id)
            from students_address a where a."studentId" = s.id), '[]'::jsonb) as addresses,
          (select to_jsonb(a) from students_address a where a.id = s."currentDropOffAddress") as "dropOffAddress"
        from students s
        """;

    private final JdbcTemplate jdbc;
    private final String timezone;
    private final AuditService audit;

    public AppDataController(JdbcTemplate jdbc, @Value("${app.timezone:America/Vancouver}") String timezone,
                             AuditService audit) {
        this.jdbc = jdbc;
        this.timezone = timezone;
        this.audit = audit;
    }

    // ------------------------------------------------------------------ team

    @GetMapping("/staff")
    public List<Map<String, Object>> staff(Authentication auth) {
        Roles.requireStaffApp(auth);
        return jdbc.queryForList(
            "select id, name, email, photo, \"phoneNumber\", \"userType\" from users "
                + "where active and lower(coalesce(\"userType\", '')) in ('staff', 'driver', 'admin', 'manager', 'owner') "
                + "order by lower(name)");
    }

    // ------------------------------------------------------------------ today

    // Who is at the school today. For every kid that is not archived: is the kid expected today (the
    // weekly schedule, or a route that was sent for today) and what happened: "checked_in" (picked up),
    // "checked_out" (went home: a parent picked the kid up), "absent", "waiting" (expected and not
    // registered yet) or "none" (not coming today).
    @GetMapping("/today")
    public ResponseEntity<String> today(Authentication auth) {
        Roles.requireStaffApp(auth);
        String json = jdbc.queryForObject("""
            with t as (select (now() at time zone CAST(? AS text))::date as d)
            select coalesce(jsonb_agg(jsonb_build_object(
                     'id', x.id,
                     'date', x.day,
                     'scheduled', x.scheduled,
                     'in_route', x.in_route,
                     'status', case when x.checked_in and x.checked_out then 'checked_out'
                                    when x.checked_in then 'checked_in'
                                    when x.is_absent then 'absent'
                                    when x.scheduled or x.in_route then 'waiting'
                                    else 'none' end,
                     'checked_in_at', x.checked_in_at,
                     'checked_out_at', x.checked_out_at,
                     'absent_at', x.absent_at)), '[]'::jsonb)::text
            from (
              select s.id, t.d as day,
                coalesce((select case extract(isodow from t.d)
                                 when 1 then ss.monday when 2 then ss.tuesday when 3 then ss.wednesday
                                 when 4 then ss.thursday when 5 then ss.friday else false end
                          from students_schedule ss where ss."studentId" = s.id limit 1), false) as scheduled,
                exists (select 1 from route_stops rs
                        join route_vans rv on rv.id = rs.route_van_id
                        join routes r on r.id = rv.route_id
                        where rs.student_id = s.id and r.date = t.d and r.type = 'pickup'
                          and r.status in ('waiting_to_start', 'in_progress', 'paused', 'finished')) as in_route,
                coalesce(a.checked_in, false) as checked_in, a.checked_in_at,
                coalesce(a.checked_out, false) as checked_out, a.checked_out_at,
                coalesce(a.is_absent, false) as is_absent, a.absent_at
              from students s cross join t
              left join lateral (
                select checked_in, checked_in_at, checked_out, checked_out_at, is_absent, absent_at
                from student_attendance
                where student_id = s.id and date = t.d
                order by coalesce(checked_in, false) desc, id limit 1) a on true
              where coalesce(s.status, 'Active') <> 'Inactive'
            ) x
            """, String.class, timezone);
        return json(json);
    }

    // ------------------------------------------------------------------ arrival without a route

    // A kid who arrives at the ASP without a pickup route (a parent brings the kid): the person who
    // receives the kid records the arrival, and the kid is "here" for today (see GET /app/today).
    // The family gets the news ("Arrived at the ASP"). If the kid was marked absent earlier today,
    // that is replaced by the arrival. Doing it twice changes nothing.
    @PostMapping("/students/{id}/here")
    @Transactional
    public Map<String, Object> markAsHere(@PathVariable UUID id, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());
        requireActiveKid(id);

        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, checked_in from student_attendance where student_id = ? "
                + "and date = (now() at time zone CAST(? AS text))::date "
                + "order by coalesce(checked_in, false) desc, id limit 1 for update",
            id, timezone);

        Map<String, Object> answer = new LinkedHashMap<>();
        if (!rows.isEmpty() && Boolean.TRUE.equals(rows.get(0).get("checked_in"))) {
            answer.put("status", "unchanged"); // already here today (by a route or by an earlier arrival)
            return answer;
        }

        if (rows.isEmpty()) {
            jdbc.update(
                "insert into student_attendance (student_id, date, checked_in, checked_in_at, checked_in_by) "
                    + "values (?, (now() at time zone CAST(? AS text))::date, true, now(), ?)",
                id, timezone, me);
        } else {
            jdbc.update(
                "update student_attendance set checked_in = true, checked_in_at = now(), checked_in_by = ?, "
                    + "is_absent = false, absent_at = null, absent_by = null where id = ?",
                me, rows.get(0).get("id"));
        }

        // The news for the family
        jdbc.update(
            "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", notes) "
                + "values (CAST('ATTENDANCE' AS feed_type), (now() at time zone CAST(? AS text)), ?, "
                + "'has a new Attendance', ?, 'Arrived at the ASP')",
            timezone, id, me);

        answer.put("status", "checked_in");
        return answer;
    }

    // ------------------------------------------------------------------ check-out

    // The kid goes home (a parent picks the kid up at the ASP). The kid must be checked in today. It is
    // recorded when and by whom (the staff member who confirmed it), exactly like the check-in, and the
    // family gets the news in the feed ("Checked out from the ASP"). Who takes the kid is the school's
    // matter: the app does not ask.
    @PostMapping("/students/{id}/checkout")
    @Transactional
    public Map<String, Object> checkOut(@PathVariable UUID id, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());
        requireActiveKid(id);

        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, checked_out from student_attendance where student_id = ? "
                + "and date = (now() at time zone CAST(? AS text))::date and checked_in = true "
                + "order by coalesce(checked_out, false), id limit 1 for update",
            id, timezone);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This kid is not checked in today");
        }

        Map<String, Object> answer = new LinkedHashMap<>();
        if (Boolean.TRUE.equals(rows.get(0).get("checked_out"))) {
            answer.put("status", "unchanged"); // already went home
            return answer;
        }

        jdbc.update(
            "update student_attendance set checked_out = true, checked_out_at = now(), checked_out_by = ? where id = ?",
            me, rows.get(0).get("id"));

        // The news for the family
        jdbc.update(
            "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", notes) "
                + "values (CAST('ATTENDANCE' AS feed_type), (now() at time zone CAST(? AS text)), ?, "
                + "'has a new Attendance', ?, 'Checked out from the ASP')",
            timezone, id, me);

        answer.put("status", "checked_out");
        return answer;
    }

    // People make mistakes: somebody checked a kid out (or in, or marked absent) by mistake and the 5 seconds
    // of "Undo" in the app were gone. The owner, the managers and the programmer can undo it, for TODAY.
    // The state goes back to what it was, the family gets a correction in the feed, and the activity log
    // keeps who corrected what.
    //   action: "checkout" (back to the ASP), "checkin" (not checked in; this also clears a check-out)
    //           or "absent" (not absent any more)
    public record Revert(String action) {}

    @PostMapping("/students/{id}/revert")
    @Transactional
    public Map<String, Object> revert(@PathVariable UUID id, @RequestBody Revert body, Authentication auth) {
        Roles.requirePeopleManager(auth);
        UUID me = UUID.fromString(auth.getName());
        requireActiveKid(id);

        String action = body.action() == null ? "" : body.action().trim().toLowerCase();
        if (!Set.of("checkout", "checkin", "absent").contains(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "action must be checkout, checkin or absent");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, checked_in, checked_out, is_absent from student_attendance where student_id = ? "
                + "and date = (now() at time zone CAST(? AS text))::date "
                + "order by coalesce(checked_in, false) desc, id limit 1 for update",
            id, timezone);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nothing is registered for this kid today");
        }
        Map<String, Object> row = rows.get(0);

        String note;
        switch (action) {
            case "checkout" -> {
                if (!Boolean.TRUE.equals(row.get("checked_out"))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This kid was not checked out");
                }
                jdbc.update("update student_attendance set checked_out = false, checked_out_at = null, "
                    + "checked_out_by = null where id = ?", row.get("id"));
                note = "Correction: still at the ASP";
            }
            case "checkin" -> {
                if (!Boolean.TRUE.equals(row.get("checked_in"))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This kid was not checked in");
                }
                jdbc.update("update student_attendance set checked_in = false, checked_in_at = null, "
                    + "checked_in_by = null, checked_out = false, checked_out_at = null, checked_out_by = null "
                    + "where id = ?", row.get("id"));
                note = "Correction: the check-in was a mistake";
            }
            default -> {
                if (!Boolean.TRUE.equals(row.get("is_absent"))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This kid was not marked absent");
                }
                jdbc.update("update student_attendance set is_absent = false, absent_at = null, absent_by = null "
                    + "where id = ?", row.get("id"));
                note = "Correction: not absent";
            }
        }

        // The family was told the first thing: it is told the correction too
        jdbc.update(
            "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", notes) "
                + "values (CAST('ATTENDANCE' AS feed_type), (now() at time zone CAST(? AS text)), ?, "
                + "'has a new Attendance', ?, ?)",
            timezone, id, me, note);

        List<String> names = jdbc.queryForList("select name from students where id = ?", String.class, id);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("action", action);
        audit.log(auth, "attendance.revert", "students", id, names.isEmpty() ? null : names.get(0), details);

        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("status", "reverted");
        answer.put("action", action);
        return answer;
    }

    // Who registered the day of a kid: the check-in, the check-out and the absence, with the name of the
    // staff member and the time. The names only go to the people who run the school (the owner, the
    // managers and the programmer): for anybody else the answer is 403, so the names never leave the API.
    @GetMapping("/students/{id}/day")
    public ResponseEntity<String> dayOf(@PathVariable UUID id, Authentication auth) {
        Roles.requirePeopleManager(auth);
        List<String> rows = jdbc.queryForList("""
            select to_jsonb(x)::text from (
              select a.checked_in, a.checked_in_at, a.route_id, a.checked_out, a.checked_out_at,
                     a.is_absent, a.absent_at,
                     ui.name as checked_in_by, uo.name as checked_out_by, ua.name as absent_by, v.name as van
              from student_attendance a
              left join users ui on ui.id = a.checked_in_by
              left join users uo on uo.id = a.checked_out_by
              left join users ua on ua.id = a.absent_by
              left join vans v on v.id = a.van_id
              where a.student_id = ? and a.date = (now() at time zone CAST(? AS text))::date
              order by coalesce(a.checked_in, false) desc, a.id
              limit 1) x
            """, String.class, id, timezone);
        return json(rows.isEmpty() ? "{}" : rows.get(0));
    }

    // ------------------------------------------------------------------ settings

    // Where the routes start and how the program is called (the dashboard sets them). Only these
    // keys: the other settings are not for the app.
    @GetMapping("/settings")
    public List<Map<String, Object>> settings(Authentication auth) {
        Roles.requireStaffApp(auth);
        return jdbc.queryForList(
            "select key, value from settings "
                + "where key in ('pickup_start_coords', 'pickup_start_address', 'after_school_name')");
    }

    // ------------------------------------------------------------------ kids

    @GetMapping("/students")
    public ResponseEntity<String> students(Authentication auth) {
        Roles.requireStaffApp(auth);
        String json = jdbc.queryForObject(
            "select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)::text from ("
                + STUDENT_SELECT + " where " + ACTIVE_KID + ") x",
            String.class);
        return json(json);
    }

    @GetMapping("/students/{id}")
    public ResponseEntity<String> student(@PathVariable UUID id, Authentication auth) {
        Roles.requireStaffApp(auth);
        List<String> rows = jdbc.queryForList(
            "select to_jsonb(x)::text from (" + STUDENT_SELECT + " where s.id = ? and " + ACTIVE_KID + ") x",
            String.class, id);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found");
        }
        return json(rows.get(0));
    }

    // Photos of the dismissal door (at most 3). Only the people who run the school (owner, manager, admin)
    // add them. It only ADDS: a photo that is already there is never removed or replaced by this route.
    public record NewDismissalPhoto(String path, Integer index) {}

    @PostMapping("/students/{id}/dismissal-photos")
    @Transactional
    public Map<String, Object> addDismissalPhoto(@PathVariable UUID id,
                                                 @RequestBody NewDismissalPhoto body,
                                                 Authentication auth) {
        Roles.requireManager(auth);
        requireActiveKid(id);

        String name = body.path() == null ? "" : body.path().trim();
        if (!SAFE_FILE_NAME.matcher(name).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid photo name");
        }

        ObjectMapper json = new ObjectMapper();
        try {
            String current = jdbc.queryForObject(
                "select coalesce(\"schoolExitPhotos\", '[]'::jsonb)::text from students where id = ? for update",
                String.class, id);
            List<Map<String, Object>> photos = json.readValue(current, new TypeReference<>() {});

            // The same photo twice: nothing to do
            for (Map<String, Object> photo : photos) {
                if (name.equals(photo.get("path"))) {
                    return photosAnswer(photos);
                }
            }
            if (photos.size() >= 3) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The three places for dismissal photos are used. A manager can change them in the dashboard.");
            }

            // The place asked for, when it is free; otherwise the first free one (0, 1 or 2)
            Set<Integer> used = new java.util.HashSet<>();
            for (Map<String, Object> photo : photos) {
                if (photo.get("index") instanceof Number number) {
                    used.add(number.intValue());
                }
            }
            int index = -1;
            if (body.index() != null && body.index() >= 0 && body.index() <= 2 && !used.contains(body.index())) {
                index = body.index();
            } else {
                for (int candidate = 0; candidate <= 2; candidate++) {
                    if (!used.contains(candidate)) {
                        index = candidate;
                        break;
                    }
                }
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("index", index);
            entry.put("path", name);
            photos.add(entry);
            photos.sort(java.util.Comparator.comparingInt(photo -> ((Number) photo.get("index")).intValue()));

            jdbc.update("update students set \"schoolExitPhotos\" = CAST(? AS jsonb) where id = ?",
                json.writeValueAsString(photos), id);
            return photosAnswer(photos);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read the photos");
        }
    }

    // ["a.jpg", "b.jpg"] as JSON text
    private static String asJsonArray(List<String> names) {
        try {
            return new ObjectMapper().writeValueAsString(names);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid photos");
        }
    }

    private static Map<String, Object> photosAnswer(List<Map<String, Object>> photos) {
        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("schoolExitPhotos", photos);
        return answer;
    }

    // ------------------------------------------------------------------ feed

    // days: how far back (default 30). afterId: only what is newer than that id (for refreshing).
    @GetMapping("/feeds")
    public ResponseEntity<String> feeds(@RequestParam(defaultValue = "30") int days,
                                        @RequestParam(required = false) Long afterId,
                                        @RequestParam(required = false) UUID studentId,
                                        Authentication auth) {
        Roles.requireStaffApp(auth);

        StringBuilder where = new StringBuilder("f.created_at >= now() - (CAST(? AS integer) * interval '1 day')");
        List<Object> args = new ArrayList<>();
        args.add(Math.min(Math.max(days, 1), 365));
        if (afterId != null) {
            where.append(" and f.id > ?");
            args.add(afterId);
        }
        if (studentId != null) {
            where.append(" and f.\"studentId\" = ?");
            args.add(studentId);
        }
        String json = jdbc.queryForObject(
            "select coalesce(jsonb_agg(to_jsonb(f) order by f.id), '[]'::jsonb)::text "
                + "from \"kidFeeds\" f where " + where,
            String.class, args.toArray());
        return json(json);
    }

    public record NewFeed(UUID studentId, String type, String mediaName, String notes) {}

    @PostMapping("/feeds")
    public ResponseEntity<String> createFeed(@RequestBody NewFeed body, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());

        String type = body.type() == null ? "" : body.type().trim().toUpperCase();
        if (!FEED_TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown feed type");
        }
        requireActiveKid(body.studentId());

        // "has a new Photo", "has a new Attendance"...
        String text = "has a new " + type.charAt(0) + type.substring(1).toLowerCase();

        String json = jdbc.queryForObject(
            "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", \"mediaName\", "
                + "\"mediaNames\", notes) "
                + "values (CAST(? AS feed_type), (now() at time zone CAST(? AS text)), ?, ?, ?, ?, CAST(? AS jsonb), ?) "
                + "returning to_jsonb(\"kidFeeds\")::text",
            String.class, type, timezone, body.studentId(), text, me,
            body.mediaName() == null ? "" : body.mediaName(),
            body.mediaName() == null || body.mediaName().isBlank() ? null : asJsonArray(List.of(body.mediaName())),
            body.notes());
        return json(json);
    }

    // The same news for MANY kids in ONE request (an incident, a group photo). All or nothing: if
    // something is wrong, nothing is posted, so trying again never leaves half of the kids with it.
    // Each kid gets ONE item, with all the photos stacked in it ("mediaNames"; "mediaName" is the first).
    public record BulkFeed(List<UUID> studentIds, String type, List<String> mediaNames, String notes) {}

    @PostMapping("/feeds/bulk")
    @Transactional
    public ResponseEntity<String> createFeedBulk(@RequestBody BulkFeed body, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());

        String type = body.type() == null ? "" : body.type().trim().toUpperCase();
        if (!FEED_TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown feed type");
        }

        List<UUID> kids = body.studentIds() == null ? List.of() : body.studentIds().stream().distinct().toList();
        if (kids.isEmpty() || kids.size() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose between 1 and 200 kids");
        }
        List<String> media = body.mediaNames() == null ? List.of() : body.mediaNames();
        if (media.size() > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At most 10 photos");
        }
        for (String name : media) {
            if (name == null || !SAFE_FILE_NAME.matcher(name).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid photo name");
            }
        }
        for (UUID kid : kids) {
            requireActiveKid(kid);
        }

        String text = "has a new " + type.charAt(0) + type.substring(1).toLowerCase();
        String note = body.notes() == null || body.notes().isBlank() ? null : body.notes().trim();

        String names = media.isEmpty() ? null : asJsonArray(media);
        String first = media.isEmpty() ? "" : media.get(0);

        List<String> created = new ArrayList<>();
        for (UUID kid : kids) {
            created.add(jdbc.queryForObject(
                "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", \"mediaName\", "
                    + "\"mediaNames\", notes) "
                    + "values (CAST(? AS feed_type), (now() at time zone CAST(? AS text)), ?, ?, ?, ?, CAST(? AS jsonb), ?) "
                    + "returning to_jsonb(\"kidFeeds\")::text",
                String.class, type, timezone, kid, text, me, first, names, note));
        }
        return json("[" + String.join(",", created) + "]");
    }

    // ------------------------------------------------------------------ chat

    @GetMapping("/messages/unread")
    public ResponseEntity<String> unread(Authentication auth) {
        Roles.requireStaffApp(auth);
        String json = jdbc.queryForObject(
            "select coalesce(jsonb_agg(x.doc order by x.created), '[]'::jsonb)::text from ("
                + "select m.created_at as created, to_jsonb(m) || jsonb_build_object("
                + "'users', (select jsonb_build_object('id', u.id, 'name', u.name, 'photo', u.photo, "
                + "'userType', u.\"userType\") from users u where u.id = m.sender_user_id), "
                + "'students', (select jsonb_build_object('id', s.id, 'name', s.name, 'photo', s.photo) "
                + "from students s where s.id = m.student_id)) as doc "
                + "from message m where coalesce(m.isread, false) = false and " + FROM_FAMILY + ") x",
            String.class);
        return json(json);
    }

    @GetMapping("/messages")
    public ResponseEntity<String> thread(@RequestParam UUID studentId,
                                         @RequestParam(defaultValue = "100") int limit,
                                         Authentication auth) {
        Roles.requireStaffApp(auth);
        String json = jdbc.queryForObject(
            "select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc), '[]'::jsonb)::text from ("
                + "select * from message where student_id = ? order by created_at desc limit ?) m",
            String.class, studentId, Math.min(Math.max(limit, 1), 500));
        return json(json);
    }

    public record NewMessage(UUID studentId, String content) {}

    @PostMapping("/messages")
    public ResponseEntity<String> send(@RequestBody NewMessage body, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());

        String content = body.content() == null ? "" : body.content().trim();
        if (content.isEmpty() || content.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "The message cannot be empty or longer than 2000 characters");
        }
        requireActiveKid(body.studentId());

        String json = jdbc.queryForObject(
            "insert into message (student_id, sender_user_id, content) values (?, ?, ?) "
                + "returning to_jsonb(message)::text",
            String.class, body.studentId(), me, content);
        return json(json);
    }

    public record ReadRequest(UUID studentId) {}

    // The team read what the family wrote about this kid
    @PostMapping("/messages/read")
    public Map<String, Integer> markRead(@RequestBody ReadRequest body, Authentication auth) {
        Roles.requireStaffApp(auth);
        int updated = jdbc.update(
            "update message m set isread = true where m.student_id = ? "
                + "and coalesce(m.isread, false) = false and " + FROM_FAMILY,
            body.studentId());
        return Map.of("updated", updated);
    }

    // ------------------------------------------------------------------ helpers

    private void requireActiveKid(UUID studentId) {
        if (studentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "studentId is required");
        }
        Integer found = jdbc.queryForObject(
            "select count(*) from students s where s.id = ? and " + ACTIVE_KID, Integer.class, studentId);
        if (found == null || found == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found");
        }
    }

    private static ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
