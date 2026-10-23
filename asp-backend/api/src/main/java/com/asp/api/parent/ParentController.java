package com.asp.api.parent;

import com.asp.api.auth.Roles;
import com.asp.api.files.FileSigner;
import com.asp.api.files.FileStorage;
import com.asp.api.push.PushService;
import java.time.Instant;
import java.util.ArrayList;
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
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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

    public ParentController(JdbcTemplate jdbc, @Value("${app.timezone:America/Vancouver}") String timezone,
                            FileStorage storage, FileSigner signer, PushService push) {
        this.jdbc = jdbc;
        this.timezone = timezone;
        this.storage = storage;
        this.signer = signer;
        this.push = push;
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

    @GetMapping("/kids")
    public ResponseEntity<String> kids(Authentication auth) {
        UUID me = requireParent(auth);

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
                         'absent_at', k.absent_at)
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
                     coalesce(a.is_absent, false) as is_absent, a.absent_at
              from students s
              cross join t
              left join schools sc on sc.id = s."schoolId"
              left join lateral (select * from students_schedule where "studentId" = s.id limit 1) ss on true
              left join lateral (
                select checked_in, checked_in_at, checked_out, checked_out_at, is_absent, absent_at
                from student_attendance
                where student_id = s.id and date = t.d
                order by coalesce(checked_in, false) desc, id limit 1) a on true
              where s.id in (""" + MY_KIDS + """
                )
                and coalesce(s.status, 'Active') <> 'Inactive'
            ) k
            """, String.class, timezone, me);
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
