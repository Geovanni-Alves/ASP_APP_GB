package com.asp.api.audit;

import com.asp.api.auth.Roles;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Reading the activity log. Only the owner, the managers and the programmer may read it
 * (an admin may not). The programmer's own actions are only visible to the programmer.
 *
 *   GET /audit?actor=&entityType=&entityId=&action=&q=&from=2026-10-01&to=2026-10-31&before=&limit=100
 *   -> an array, newest first. For the next page, pass before = the id of the last entry you got.
 */
@RestController
@RequestMapping("/audit")
public class AuditController {

    private final JdbcTemplate jdbc;
    private final String timezone;

    public AuditController(JdbcTemplate jdbc, @Value("${app.timezone:America/Vancouver}") String timezone) {
        this.jdbc = jdbc;
        this.timezone = timezone;
    }

    @GetMapping
    public ResponseEntity<String> list(@RequestParam(required = false) UUID actor,
                                       @RequestParam(required = false) String entityType,
                                       @RequestParam(required = false) String entityId,
                                       @RequestParam(required = false) String action,
                                       @RequestParam(required = false) String q,
                                       @RequestParam(required = false) String from,
                                       @RequestParam(required = false) String to,
                                       @RequestParam(required = false) Long before,
                                       @RequestParam(defaultValue = "100") int limit,
                                       Authentication auth) {
        Roles.requirePeopleManager(auth);

        StringBuilder where = new StringBuilder("1 = 1");
        List<Object> args = new ArrayList<>();

        if (!Roles.isSuperAdmin(auth)) {
            // Nothing the programmer did, and nothing about the programmer's account
            where.append(" and a.actor_role is distinct from 'superadmin'")
                .append(" and not (a.entity_type in ('user', 'staff', 'users') and a.entity_id in "
                    + "(select id::text from users where lower(coalesce(\"userType\", '')) = 'superadmin'))");
        }
        if (actor != null) {
            where.append(" and a.actor_id = ?");
            args.add(actor);
        }
        if (entityType != null && !entityType.isBlank()) {
            where.append(" and a.entity_type = ?");
            args.add(entityType.trim());
        }
        if (entityId != null && !entityId.isBlank()) {
            where.append(" and a.entity_id = ?");
            args.add(entityId.trim());
        }
        if (action != null && !action.isBlank()) {
            where.append(" and a.action ilike ? escape '\\'");
            args.add(like(action) + "%");
        }
        if (q != null && !q.isBlank()) {
            where.append(" and (a.actor_name ilike ? escape '\\' or a.entity_label ilike ? escape '\\' "
                + "or a.action ilike ? escape '\\')");
            String pattern = "%" + like(q) + "%";
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
        }
        if (from != null && !from.isBlank()) {
            where.append(" and a.at >= (CAST(? AS date)::timestamp at time zone CAST(? AS text))");
            args.add(parseDate(from));
            args.add(timezone);
        }
        if (to != null && !to.isBlank()) {
            where.append(" and a.at < ((CAST(? AS date) + 1)::timestamp at time zone CAST(? AS text))");
            args.add(parseDate(to));
            args.add(timezone);
        }
        if (before != null) {
            where.append(" and a.id < ?");
            args.add(before);
        }
        args.add(Math.min(Math.max(limit, 1), 500));

        String json = jdbc.queryForObject(
            "select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), '[]'::jsonb)::text from ("
                + "select a.* from audit_log a where " + where + " order by a.id desc limit ?) x",
            String.class, args.toArray());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
    }

    // The text the person typed, with the characters that mean something to LIKE made harmless
    private static String like(String text) {
        return text.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static String parseDate(String value) {
        try {
            return LocalDate.parse(value.trim()).toString();
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dates must look like 2026-10-31");
        }
    }
}
