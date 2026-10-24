package com.asp.api.parent;

import com.asp.api.auth.Roles;
import com.asp.api.files.FileSigner;
import com.asp.api.files.FileStorage;
import com.asp.api.push.PushService;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Everything the app of the parents may ask. ONE rule runs through all of it: a parent only ever sees the
 * kids that are linked to HIS account (the account is linked to a contact, and the contact to the kids).
 * Nothing here takes a "who am I" from the phone: the person comes from the login.
 *
 *   GET /parent/kids                     the kids of the family, with how today is going for each
 *   GET /parent/kids/{id}/feed           the news of one kid (newest first, in pages)
 *   GET /parent/messages/unread          how many messages of the team are waiting, by kid
 *   GET /parent/kids/{id}/messages       the conversation about one kid
 *   POST /parent/kids/{id}/messages      the family writes to the team
 *   PUT /parent/kids/{id}/messages/read  the family read what the team wrote
 *   POST /parent/kids/{id}/absent        the kid will not come today (only until the cutoff time)
 *   POST /parent/me/photo                the family changes ITS OWN profile photo (never the photo of a kid)
 *   DELETE /parent/me/photo              the family removes its own profile photo
 *   GET /parent/files/signed-url         a temporary link to a photo or video the family is allowed to see
 */
@RestController
@RequestMapping("/parent")
public class ParentController {

    // The kids of a person: the contacts linked to his account, and the kids of those contacts
    private static final String MY_KIDS =
        "select sf.student_id from student_family sf join contacts c on c.id = sf.contact_id where c.user_id = ?";

    private static final Set<String> FEED_BUCKETS = Set.of("feedPhotos", "feedVideos", "photos", "videos");
    private static final Set<String> FEED_TYPES =
        Set.of("ATTENDANCE", "PHOTO", "PROMOTION", "ACTIVITY", "VIDEO", "INCIDENT");

    // The news of a kid. Each item comes with who posted it and its pictures/videos as a list ("media"),
    // whether the post was made with one picture (mediaName) or with a stack of them (mediaNames).
    private static final String FEED_HEAD = """
        select coalesce(jsonb_agg(x.doc order by x.id desc), '[]'::jsonb)::text
        from (
          select f.id, jsonb_build_object(
              'id', f.id,
              'type', f.type,
              'text', f.text,
              'notes', nullif(trim(coalesce(f.notes, '')), ''),
              'dateTime', f."dateTime",
              'createdAt', f.created_at,
              'mediaExpired', f.media_expired,
              'by', case when u.id is null then null
                         else jsonb_build_object('name', u.name, 'photo', u.photo) end,
              'media', coalesce((
                  select jsonb_agg(jsonb_build_object(
                           'name', m.name,
                           'kind', case when lower(m.name) ~ '[.](mp4|mov|m4v)$' then 'video' else 'photo' end))
                  from jsonb_array_elements_text(
                         coalesce(nullif(f."mediaNames", '[]'::jsonb),
                                  case when coalesce(f."mediaName", '') <> ''
                                       then jsonb_build_array(f."mediaName") else '[]'::jsonb end)) as m(name)
              ), '[]'::jsonb)
            ) as doc
          from "kidFeeds" f
          left join users u on u.id = f."creatorId"
          where f."studentId" = ?
        """;
    private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9._-]{1,200}$");

    // A message written by somebody of the team (a user with one of these roles, and not a contact)
    private static final String FROM_TEAM =
        "(m.sender_contact_id is null and exists (select 1 from users su where su.id = m.sender_user_id "
            + "and lower(coalesce(su.\"userType\", '')) in "
            + "('staff', 'driver', 'admin', 'manager', 'owner', 'superadmin')))";

    private final JdbcTemplate jdbc;
    private final String timezone;
    private final FileStorage storage;
    private final FileSigner signer;
    private final PushService push;
    private final TransactionTemplate transaction;

    public ParentController(JdbcTemplate jdbc, @Value("${app.timezone:America/Vancouver}") String timezone,
                            FileStorage storage, FileSigner signer, PushService push,
                            TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.timezone = timezone;
        this.storage = storage;
        this.signer = signer;
        this.push = push;
        this.transaction = transaction;
    }

    /** Families only (the super admin may look too, for support). Returns the id of the person. */
    private UUID requireParent(Authentication auth) {
        // (Roles.roleOf only knows the roles of the team: for a family it answers an empty text, so the
        // authority is read directly)
        boolean isFamily = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_parent"));
        if (!isFamily && !Roles.isSuperAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is only for families");
        }
        return UUID.fromString(auth.getName());
    }

    private ResponseEntity<String> json(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    // After this time of the day the family can no longer say in the app that a kid will not come (the route is
    // about to leave): the family calls the program. It comes from the setting "absence_cutoff_time" ("13:00"),
    // and when there is none it is 1:00 PM.
    private LocalTime absenceCutoff() {
        try {
            List<String> values = jdbc.queryForList(
                "select value from settings where key = 'absence_cutoff_time' limit 1", String.class);
            if (!values.isEmpty() && values.get(0) != null) {
                String text = values.get(0).trim();
                if (text.matches("^([01]?\\d|2[0-3]):[0-5]\\d$")) {
                    String[] parts = text.split(":");
                    return LocalTime.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
                }
            }
        } catch (Exception e) {
            // no setting: the default
        }
        return LocalTime.of(13, 0);
    }

    // TEST MODE, only for the accounts listed in the setting "parent_test_emails" (e-mails separated by commas).
    // For them the family can say "not coming today" on any day and at any hour, even with no route (to try the
    // app on a Saturday). A real family is never affected: it is not in the list, and with the setting empty
    // nobody is.
    private boolean isTestAccount(UUID me) {
        try {
            List<String> values = jdbc.queryForList(
                "select value from settings where key = 'parent_test_emails' limit 1", String.class);
            if (values.isEmpty() || values.get(0) == null || values.get(0).isBlank()) {
                return false;
            }
            List<String> emails = jdbc.queryForList(
                "select lower(email) from users where id = ?", String.class, me);
            if (emails.isEmpty() || emails.get(0) == null) {
                return false;
            }
            for (String listed : values.get(0).split(",")) {
                if (listed.trim().equalsIgnoreCase(emails.get(0))) {
                    return true;
                }
            }
        } catch (Exception e) {
            // no setting: not a test account
        }
        return false;
    }

    private String cutoffLabel(LocalTime cutoff) {
        return cutoff.format(DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH));
    }

    @GetMapping("/kids")
    public ResponseEntity<String> kids(Authentication auth) {
        UUID me = requireParent(auth);
        LocalTime cutoff = absenceCutoff();
        boolean testMode = isTestAccount(me);

        String json = jdbc.queryForObject("""
            with t as (select (now() at time zone CAST(? AS text))::date as d)
            select coalesce(jsonb_agg(jsonb_build_object(
                     'id', k.id,
                     'name', k.name,
                     'photo', k.photo,
                     'birthDate', k.birth_date,
                     'school', case when k.school_id is null then null
                                    else jsonb_build_object('id', k.school_id, 'name', k.school_name) end,
                     'dismissalTime', k.dismissal_time,
                     'useDropOffService', k.use_drop_off,
                     'schedule', jsonb_build_object('monday', k.mon, 'tuesday', k.tue, 'wednesday', k.wed,
                                                    'thursday', k.thu, 'friday', k.fri),
                     'today', jsonb_build_object(
                         'date', k.day,
                         'scheduled', k.scheduled,
                         'status', case when k.checked_in and k.checked_out then 'checked_out'
                                        when k.checked_in then 'checked_in'
                                        when k.is_absent then 'absent'
                                        when k.scheduled or k.in_route then 'waiting'
                                        else 'none' end,
                         'checked_in_at', k.checked_in_at,
                         'checked_out_at', k.checked_out_at,
                         'absent_at', k.absent_at,
                         'checked_in_by', k.checked_in_by_name,
                         'checked_out_by', k.checked_out_by_name,
                         'absent_by', k.absent_by_name,
                         'absent_by_family', k.absent_by_family,
                         'absence_cutoff', CAST(? AS text),
                         'test_mode', k.test_mode,
                         'can_mark_absent', (not k.checked_in and not k.is_absent
                                             and (k.test_mode
                                                  or ((k.scheduled or k.in_route) and k.before_cutoff))))
                   ) order by k.name), '[]'::jsonb)::text
            from (
              select s.id, s.name, s.photo, s."birthDate" as birth_date, s."schoolId" as school_id,
                     sc.name as school_name, s."dismissalTime" as dismissal_time,
                     s."useDropOffService" as use_drop_off,
                     coalesce(ss.monday, false) as mon, coalesce(ss.tuesday, false) as tue,
                     coalesce(ss.wednesday, false) as wed, coalesce(ss.thursday, false) as thu,
                     coalesce(ss.friday, false) as fri,
                     t.d as day,
                     coalesce(case extract(isodow from t.d)
                                when 1 then ss.monday when 2 then ss.tuesday when 3 then ss.wednesday
                                when 4 then ss.thursday when 5 then ss.friday else false end, false) as scheduled,
                     exists (select 1 from route_stops rs
                             join route_vans rv on rv.id = rs.route_van_id
                             join routes r on r.id = rv.route_id
                             where rs.student_id = s.id and r.date = t.d and r.type = 'pickup'
                               and r.status in ('waiting_to_start', 'in_progress', 'paused', 'finished')) as in_route,
                     coalesce(a.checked_in, false) as checked_in, a.checked_in_at,
                     coalesce(a.checked_out, false) as checked_out, a.checked_out_at,
                     coalesce(a.is_absent, false) as is_absent, a.absent_at,
                     a.checked_in_by_name, a.checked_out_by_name, a.absent_by_name,
                     coalesce(a.absent_by_family, false) as absent_by_family,
                     ((now() at time zone CAST(? AS text))::time < CAST(? AS time)) as before_cutoff,
                     CAST(? AS boolean) as test_mode
              from students s
              cross join t
              left join schools sc on sc.id = s."schoolId"
              left join lateral (select * from students_schedule where "studentId" = s.id limit 1) ss on true
              left join lateral (
                select sa.checked_in, sa.checked_in_at, sa.checked_out, sa.checked_out_at,
                       sa.is_absent, sa.absent_at,
                       (select u.name from users u where u.id = sa.checked_in_by) as checked_in_by_name,
                       (select u.name from users u where u.id = sa.checked_out_by) as checked_out_by_name,
                       (select u.name from users u where u.id = sa.absent_by) as absent_by_name,
                       exists (select 1 from users u where u.id = sa.absent_by
                               and lower(coalesce(u."userType", '')) = 'parent') as absent_by_family
                from student_attendance sa
                where sa.student_id = s.id and sa.date = t.d
                order by coalesce(sa.checked_in, false) desc, sa.id limit 1) a on true
              where s.id in (""" + MY_KIDS + """
                )
                and coalesce(s.status, 'Active') <> 'Inactive'
            ) k
            """, String.class, timezone, cutoffLabel(cutoff), timezone, cutoff.toString(), testMode, me);
        return json(json);
    }

    private void requireMyKid(UUID me, UUID studentId) {
        List<Integer> found = jdbc.queryForList(
            "select 1 from student_family sf join contacts c on c.id = sf.contact_id "
                + "where c.user_id = ? and sf.student_id = ? limit 1",
            Integer.class, me, studentId);
        // One answer for "it is not your kid" and for "it does not exist"
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Child not found");
        }
    }

    /**
     * The news of ONE kid, newest first. limit: the size of a page (default 30). beforeId: the next page
     * (only what is older than that id). types: only some kinds, separated by commas (for the gallery: PHOTO,VIDEO).
     */
    @GetMapping("/kids/{studentId}/feed")
    public ResponseEntity<String> feed(@PathVariable UUID studentId,
                                       @RequestParam(defaultValue = "30") int limit,
                                       @RequestParam(required = false) Long beforeId,
                                       @RequestParam(required = false) String types,
                                       Authentication auth) {
        UUID me = requireParent(auth);
        requireMyKid(me, studentId);

        StringBuilder sql = new StringBuilder(FEED_HEAD);
        List<Object> args = new ArrayList<>();
        args.add(studentId);

        if (beforeId != null) {
            sql.append(" and f.id < ?\n");
            args.add(beforeId);
        }
        if (types != null && !types.isBlank()) {
            List<String> wanted = new ArrayList<>();
            for (String type : types.split(",")) {
                String name = type.trim().toUpperCase();
                if (FEED_TYPES.contains(name)) {
                    wanted.add(name);
                }
            }
            if (!wanted.isEmpty()) {
                sql.append(" and f.type::text in (")
                    .append(String.join(", ", wanted.stream().map(w -> "?").toList()))
                    .append(")\n");
                args.addAll(wanted);
            }
        }
        sql.append(" order by f.id desc limit ?) x");
        args.add(Math.min(Math.max(limit, 1), 60));

        return json(jdbc.queryForObject(sql.toString(), String.class, args.toArray()));
    }

    private String setting(String key) {
        try {
            List<String> values = jdbc.queryForList(
                "select value from settings where key = ? limit 1", String.class, key);
            if (!values.isEmpty() && values.get(0) != null && !values.get(0).isBlank()) {
                return values.get(0).trim();
            }
        } catch (Exception e) {
            // no setting
        }
        return null;
    }

    /**
     * What the app of the family needs to know about the program: how long the pictures and videos stay on the
     * server, and how to reach the program (the family calls when it is too late to tell the absence in the app).
     */
    @GetMapping("/settings")
    public Map<String, Object> settings(Authentication auth) {
        requireParent(auth);
        int days = 60;
        String configured = setting("media_retention_days");
        if (configured != null) {
            try {
                int parsed = Integer.parseInt(configured);
                if (parsed >= 1 && parsed <= 3650) {
                    days = parsed;
                }
            } catch (NumberFormatException e) {
                // the default
            }
        }
        Map<String, Object> answer = new java.util.LinkedHashMap<>();
        answer.put("mediaRetentionDays", days);
        answer.put("programName", setting("after_school_name"));
        answer.put("programPhone", setting("program_phone"));
        answer.put("programEmail", setting("program_email"));
        return answer;
    }

    // ------------------------------------------------------------------ the photo of the parent

    /**
     * The family changes its OWN photo. The photo of a kid is chosen by the team, never here. The old photo is
     * deleted from the server.
     */
    @PostMapping("/me/photo")
    public Map<String, Object> changeMyPhoto(@RequestParam("file") MultipartFile file,
                                             Authentication auth) throws IOException {
        UUID me = requireParent(auth);

        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String extension = switch (type) {
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/png" -> "png";
            default -> null;
        };
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Please use a JPEG or PNG photo");
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The photo is too large");
        }

        String name;
        try (InputStream in = file.getInputStream()) {
            name = storage.save("profilePhotos", in, extension);
        }

        List<String> before = jdbc.queryForList("select photo from users where id = ?", String.class, me);
        jdbc.update("update users set photo = ?, updated_at = now() where id = ?", name, me);
        deleteFile(before.isEmpty() ? null : before.get(0));
        return Map.of("photo", name);
    }

    @DeleteMapping("/me/photo")
    public Map<String, Object> removeMyPhoto(Authentication auth) {
        UUID me = requireParent(auth);
        List<String> before = jdbc.queryForList("select photo from users where id = ?", String.class, me);
        jdbc.update("update users set photo = null, updated_at = now() where id = ?", me);
        deleteFile(before.isEmpty() ? null : before.get(0));
        return Map.of("photo", "");
    }

    private void deleteFile(String name) {
        if (name == null || name.isBlank()) {
            return;
        }
        try {
            storage.delete("profilePhotos", name);
        } catch (IOException e) {
            // the file stays on the disk: nothing breaks
        }
    }

    /** The next events of the program (the card opens its link, when it has one). */
    @GetMapping("/events")
    public ResponseEntity<String> events(Authentication auth) {
        requireParent(auth);
        String json = jdbc.queryForObject("""
            select coalesce(jsonb_agg(jsonb_build_object(
                     'id', e.id,
                     'name', e.name,
                     'date', e.date,
                     'image', e.image,
                     'link', case when e.link ~* '^https?://' then e.link else null end
                   ) order by e.date), '[]'::jsonb)::text
            from (select * from events
                  where date >= (now() at time zone CAST(? AS text))::date
                  order by date limit 10) e
            """, String.class, timezone);
        return json(json);
    }

    // ------------------------------------------------------------------ chat

    /** How many messages of the team are waiting to be read, by kid (only the kids of the family). */
    @GetMapping("/messages/unread")
    public ResponseEntity<String> unread(Authentication auth) {
        UUID me = requireParent(auth);
        String json = jdbc.queryForObject("""
            select coalesce(jsonb_agg(jsonb_build_object('studentId', x.student_id, 'count', x.n)), '[]'::jsonb)::text
            from (
              select m.student_id, count(*) as n
              from message m
              where m.student_id in (""" + MY_KIDS + """
                )
                and coalesce(m.isread, false) = false
                and """ + FROM_TEAM + """

              group by m.student_id
            ) x
            """, String.class, me);
        return json(json);
    }

    /** The conversation about ONE kid, newest first. Each message says who wrote it and whether it is the team. */
    @GetMapping("/kids/{studentId}/messages")
    public ResponseEntity<String> thread(@PathVariable UUID studentId,
                                         @RequestParam(defaultValue = "100") int limit,
                                         Authentication auth) {
        UUID me = requireParent(auth);
        requireMyKid(me, studentId);
        String json = jdbc.queryForObject("""
            select coalesce(jsonb_agg(x.doc order by x.created desc), '[]'::jsonb)::text from (
              select m.created_at as created,
                     to_jsonb(m) || jsonb_build_object('sender', jsonb_build_object(
                       'name', coalesce(u.name, nullif(trim(coalesce(c."firstName", '') || ' '
                                                           || coalesce(c."lastName", '')), '')),
                       'photo', u.photo,
                       'isTeam', lower(coalesce(u."userType", '')) in
                                 ('staff', 'driver', 'admin', 'manager', 'owner', 'superadmin'))) as doc
              from message m
              left join users u on u.id = m.sender_user_id
              left join contacts c on c.id = m.sender_contact_id
              where m.student_id = ?
              order by m.created_at desc limit ?
            ) x
            """, String.class, studentId, Math.min(Math.max(limit, 1), 500));
        return json(json);
    }

    public record NewMessage(String content) {}

    /** The family writes to the team. The managers, admins and owners get a push. */
    @PostMapping("/kids/{studentId}/messages")
    public ResponseEntity<String> sendMessage(@PathVariable UUID studentId, @RequestBody NewMessage body,
                                              Authentication auth) {
        UUID me = requireParent(auth);
        requireMyKid(me, studentId);

        String content = body.content() == null ? "" : body.content().trim();
        if (content.isEmpty() || content.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "The message cannot be empty or longer than 2000 characters");
        }

        String json = jdbc.queryForObject("""
            insert into message (student_id, sender_user_id, sender_contact_id, content, isread)
            values (?, ?,
                    (select c.id from student_family sf join contacts c on c.id = sf.contact_id
                     where c.user_id = ? and sf.student_id = ? limit 1),
                    ?, false)
            returning to_jsonb(message)::text
            """, String.class, studentId, me, me, studentId, content);

        // The team is told (the message is saved: a push that fails changes nothing)
        try {
            List<UUID> team = jdbc.queryForList("""
                select u.id from users u
                where lower(u."userType") in ('owner', 'manager', 'admin') and coalesce(u.active, true)
                """, UUID.class);
            List<String> names = jdbc.queryForList(
                "select split_part(name, ' ', 1) from students where id = ?", String.class, studentId);
            String kid = names.isEmpty() ? "a child" : names.get(0);
            String preview = content.length() > 100 ? content.substring(0, 100) + "…" : content;
            Map<String, Object> data = Map.of("type", "message", "studentId", studentId.toString());
            push.sendToUsers(team, "New message about " + kid, preview, data);
        } catch (Exception e) {
            // nothing: the message is saved
        }
        return json(json);
    }

    /** The family opened the conversation: what the team wrote is marked as read (the ticks turn green). */
    @PutMapping("/kids/{studentId}/messages/read")
    public Map<String, Object> markRead(@PathVariable UUID studentId, Authentication auth) {
        UUID me = requireParent(auth);
        requireMyKid(me, studentId);
        int changed = jdbc.update("""
            update message m set isread = true
            where m.student_id = ? and coalesce(m.isread, false) = false and """ + FROM_TEAM + """
            """, studentId);
        return Map.of("marked", changed);
    }

    // ------------------------------------------------------------------ absence

    public record AbsenceBody(String note) {}

    private String firstNameOf(UUID studentId) {
        List<String> names = jdbc.queryForList(
            "select split_part(name, ' ', 1) from students where id = ?", String.class, studentId);
        return names.isEmpty() ? "Your child" : names.get(0);
    }

    // A feed item that tells the team and the family what happened
    private void attendanceNews(UUID studentId, UUID me, String notes) {
        jdbc.update(
            "insert into \"kidFeeds\" (type, \"dateTime\", \"studentId\", text, \"creatorId\", notes) "
                + "values (CAST('ATTENDANCE' AS feed_type), (now() at time zone CAST(? AS text)), ?, "
                + "'has a new Attendance', ?, ?)",
            timezone, studentId, me, notes);
    }

    // A message in the chat of the kid (it appears for the team as a message of the family) and a push to the
    // managers. It never breaks what called it.
    private void tellTheTeam(UUID studentId, UUID me, String content) {
        try {
            jdbc.update("""
                insert into message (student_id, sender_user_id, sender_contact_id, content, isread)
                values (?, ?,
                        (select c.id from student_family sf join contacts c on c.id = sf.contact_id
                         where c.user_id = ? and sf.student_id = ? limit 1),
                        ?, false)
                """, studentId, me, me, studentId, content);
            List<UUID> team = jdbc.queryForList("""
                select u.id from users u
                where lower(u."userType") in ('owner', 'manager', 'admin') and coalesce(u.active, true)
                """, UUID.class);
            String preview = content.length() > 100 ? content.substring(0, 100) + "…" : content;
            Map<String, Object> data = Map.of("type", "message", "studentId", studentId.toString());
            push.sendToUsers(team, "New message about " + firstNameOf(studentId), preview, data);
        } catch (Exception e) {
            // nothing: the absence itself is saved
        }
    }

    /** The family says the kid will not come today. Only for today, and only before the kid is at the ASP. */
    @PostMapping("/kids/{studentId}/absent")
    public Map<String, Object> markAbsent(@PathVariable UUID studentId,
                                          @RequestBody(required = false) AbsenceBody body,
                                          Authentication auth) {
        UUID me = requireParent(auth);
        requireMyKid(me, studentId);

        String note = body == null || body.note() == null ? "" : body.note().trim();
        if (note.length() > 300) {
            note = note.substring(0, 300);
        }
        final String reason = note;

        // After the cutoff the family calls the program (the test accounts skip this)
        LocalTime cutoff = absenceCutoff();
        Boolean late = jdbc.queryForObject(
            "select (now() at time zone CAST(? AS text))::time >= CAST(? AS time)", Boolean.class,
            timezone, cutoff.toString());
        if (Boolean.TRUE.equals(late) && !isTestAccount(me)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "It is after " + cutoffLabel(cutoff) + ". Please call the program to tell us that "
                    + firstNameOf(studentId) + " will not come today.");
        }

        Boolean changed = transaction.execute(tx -> {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                select id, checked_in, is_absent from student_attendance
                where student_id = ? and date = (now() at time zone CAST(? AS text))::date
                order by (route_id is null), id limit 1
                """, studentId, timezone);
            if (!rows.isEmpty() && Boolean.TRUE.equals(rows.get(0).get("checked_in"))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Your child is already at the ASP today");
            }
            if (!rows.isEmpty() && Boolean.TRUE.equals(rows.get(0).get("is_absent"))) {
                return false; // it was already marked
            }

            // The pickup route of today in which the kid is (the team reads the attendance by route)
            List<Map<String, Object>> route = jdbc.queryForList("""
                select r.id as route_id, rv.van_id
                from route_stops rs
                join route_vans rv on rv.id = rs.route_van_id
                join routes r on r.id = rv.route_id
                where rs.student_id = ? and r.type = 'pickup'
                  and r.date = (now() at time zone CAST(? AS text))::date
                  and r.status in ('waiting_to_start', 'in_progress', 'paused')
                limit 1
                """, studentId, timezone);
            UUID routeId = route.isEmpty() ? null : (UUID) route.get(0).get("route_id");
            UUID vanId = route.isEmpty() ? null : (UUID) route.get(0).get("van_id");

            if (rows.isEmpty()) {
                jdbc.update("""
                    insert into student_attendance (student_id, route_id, van_id, date, is_absent, absent_at, absent_by)
                    values (?, ?, ?, (now() at time zone CAST(? AS text))::date, true, now(), ?)
                    """, studentId, routeId, vanId, timezone, me);
            } else {
                jdbc.update("""
                    update student_attendance
                    set is_absent = true, absent_at = now(), absent_by = ?,
                        route_id = coalesce(route_id, ?), van_id = coalesce(van_id, ?)
                    where id = ?
                    """, me, routeId, vanId, rows.get(0).get("id"));
            }
            attendanceNews(studentId, me, "Marked as absent by the family");
            return true;
        });

        if (Boolean.TRUE.equals(changed)) {
            String kid = firstNameOf(studentId);
            tellTheTeam(studentId, me, kid + " will not come today" + (reason.isEmpty() ? "." : ": " + reason));
        }
        return Map.of("status", "absent");
    }

    /**
     * A temporary link to a photo or a video. The generic /files/signed-url is only for the team; here the
     * family gets a link ONLY for what belongs to its own kids (the photo of the kid, the pictures and videos
     * of the feed of the kid) and for the photos of the team and of the person himself (avatars of the chat).
     */
    @GetMapping("/files/signed-url")
    public Map<String, String> signedUrl(@RequestParam String bucket, @RequestParam String path,
                                         @RequestParam(defaultValue = "3600") long expires,
                                         Authentication auth) {
        UUID me = requireParent(auth);

        if (!SAFE_NAME.matcher(path).matches() || path.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }
        String known = canonicalBucket(bucket);

        // One answer for "it is not yours" and for "it does not exist": nothing is revealed
        if (!mayOpen(me, known, path) || storage.load(known, path) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }

        long seconds = Math.min(Math.max(expires, 60), 86_400);
        long expiresAt = Instant.now().getEpochSecond() + seconds;
        String signature = signer.sign(known, path, expiresAt);
        return Map.of("signedUrl", "/files/" + known + "/" + path + "?exp=" + expiresAt + "&sig=" + signature);
    }

    private String canonicalBucket(String bucket) {
        for (String known : Set.of("profilePhotos", "feedPhotos", "feedVideos", "photos", "videos")) {
            if (known.equalsIgnoreCase(bucket)) {
                return known;
            }
        }
        // the vans and the photos of the school door are not for the families
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
    }

    private boolean mayOpen(UUID me, String bucket, String path) {
        List<Integer> found;
        if (bucket.equals("profilePhotos")) {
            // the photo of one of my kids, my own photo, or the photo of somebody of the team
            found = jdbc.queryForList("""
                select 1 where exists (select 1 from students s where s.photo = ? and s.id in (""" + MY_KIDS + """
                  ))
                  or exists (select 1 from users u where u.photo = ?
                             and (u.id = ? or lower(u."userType") in ('staff', 'driver', 'admin', 'manager', 'owner')))
                """, Integer.class, path, me, path, me);
        } else if (FEED_BUCKETS.contains(bucket)) {
            // a picture or a video that is in the feed of one of my kids
            found = jdbc.queryForList("""
                select 1 from "kidFeeds" f
                where f."studentId" in (""" + MY_KIDS + """
                  )
                  and (f."mediaName" = ? or f."mediaNames" @> jsonb_build_array(CAST(? AS text)))
                limit 1
                """, Integer.class, me, path, path);
        } else {
            return false;
        }
        return !found.isEmpty();
    }
}
