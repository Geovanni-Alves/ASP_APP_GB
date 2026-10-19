package com.asp.api.appdata;

import com.asp.api.auth.Roles;
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
 *   GET  /app/students                    the kids that are not archived, with school, family, address
 *   GET  /app/students/{id}               one kid
 *   POST /app/students/{id}/dismissal-photos   add a photo of the dismissal door (the only edit of a kid)
 *   GET  /app/feeds?days=30&afterId=      the feed (news about the kids)
 *   POST /app/feeds                       a new feed item (photo, video, activity...)
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

    public AppDataController(JdbcTemplate jdbc, @Value("${app.timezone:America/Vancouver}") String timezone) {
        this.jdbc = jdbc;
        this.timezone = timezone;
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

    // The only thing the team adds to a kid in the app: photos of the dismissal door (at most 3).
    // It only ADDS: a photo that is already there is never removed or replaced by this route.
    public record NewDismissalPhoto(String path, Integer index) {}

    @PostMapping("/students/{id}/dismissal-photos")
    @Transactional
    public Map<String, Object> addDismissalPhoto(@PathVariable UUID id,
                                                 @RequestBody NewDismissalPhoto body,
                                                 Authentication auth) {
        Roles.requireStaffApp(auth);
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
            "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", \"mediaName\", notes) "
                + "values (CAST(? AS feed_type), (now() at time zone CAST(? AS text)), ?, ?, ?, ?, ?) "
                + "returning to_jsonb(\"kidFeeds\")::text",
            String.class, type, timezone, body.studentId(), text, me,
            body.mediaName() == null ? "" : body.mediaName(), body.notes());
        return json(json);
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
