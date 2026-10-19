package com.asp.api.audit;

import com.asp.api.auth.Roles;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Writes the activity log (see AuditSchema). Two ways in:
 *  - log(...): an explicit entry with the details (for example "school: A -> B"). Used where the
 *    old and new values matter (edits, deactivations, people).
 *  - logRequest(...): the safety net. Every other write request is recorded by AuditInterceptor
 *    with who, when and which route, so nothing a person changes goes unnoticed.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String LOGGED = "audit.logged";
    private static final int MAX_TEXT = 500;
    private static final Pattern VARIABLE = Pattern.compile("\\{([^}/:]+)[^}]*}");

    // Never stored: they carry no meaning for a person reading the log, or they are secrets
    private static final Set<String> NOISE = Set.of("updated_at", "created_at", "password_hash", "code");

    // How to find a readable name for the thing a route is about
    private static final Map<String, String> LABEL_SQL = Map.of(
        "students", "select name from students where id = CAST(? AS uuid)",
        "vans", "select name from vans where id = CAST(? AS uuid)",
        "schools", "select name from schools where id = CAST(? AS uuid)",
        "staff", "select name from users where id = CAST(? AS uuid)",
        "users", "select name from users where id = CAST(? AS uuid)",
        "contacts", "select trim(coalesce(\"firstName\", '') || ' ' || coalesce(\"lastName\", '')) "
            + "from contacts where id = CAST(? AS uuid)");

    private final JdbcTemplate jdbc;

    public AuditService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ------------------------------------------------------------------ explicit entries

    /** An entry written by the code that did the change, with its details. */
    public void log(Authentication auth, String action, String entityType, Object entityId,
                    String entityLabel, Map<String, Object> details) {
        insertFromAuth(auth, action, entityType, entityId == null ? null : String.valueOf(entityId),
            entityLabel, details);
        markLogged();
    }

    /** A person signed in (or accepted an invite). */
    public void loginOk(UUID userId, String name, String role, String app, String action) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("app", app);
        insert(userId, name, role == null ? null : role.toLowerCase(), action, "login", null, name, details);
    }

    /** A sign-in that did not work: who tried (the e-mail they typed) and why. */
    public void loginFailed(String email, String app, String reason) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("app", app);
        details.put("reason", reason);
        insert(null, null, null, "login.failed", "login", null, truncate(email, 200), details);
    }

    // ------------------------------------------------------------------ the safety net

    /** One write request, recorded by AuditInterceptor when nothing more specific was recorded. */
    public void logRequest(Authentication auth, String method, String pattern, Map<String, String> vars, int status) {
        List<String> names = variableNames(pattern);
        String entityType = firstSegment(pattern);
        String entityId = names.isEmpty() || vars == null ? null : vars.get(names.get(0));

        String label = entityId == null ? null : labelFor(entityType, entityId);
        if (label == null && "files".equals(entityType) && names.size() > 1 && vars != null) {
            label = vars.get(names.get(names.size() - 1)); // the file name
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("method", method);
        details.put("path", pattern);
        details.put("status", status);

        String action = (status == 403 ? "denied: " : "") + method + " " + pattern;
        insertFromAuth(auth, action, entityType, entityId, label, details);
    }

    /** True when the code already wrote a detailed entry for this request. */
    public boolean wasLogged() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        return attributes != null && attributes.getAttribute(LOGGED, RequestAttributes.SCOPE_REQUEST) != null;
    }

    /** Says "nothing to add for this request" (for example an edit that changed nothing). */
    public void markLogged() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            attributes.setAttribute(LOGGED, Boolean.TRUE, RequestAttributes.SCOPE_REQUEST);
        }
    }

    // ------------------------------------------------------------------ helpers for the callers

    /** The fields that are different: { field: { from, to } }. Fields without meaning are left out. */
    public static Map<String, Object> diff(Map<String, Object> before, Map<String, Object> after) {
        Map<String, Object> changes = new LinkedHashMap<>();
        Set<String> keys = new LinkedHashSet<>(before.keySet());
        keys.addAll(after.keySet());
        for (String key : keys) {
            if (NOISE.contains(key)) {
                continue;
            }
            Object from = norm(before.get(key));
            Object to = norm(after.get(key));
            if (!Objects.equals(from, to)) {
                Map<String, Object> change = new LinkedHashMap<>();
                change.put("from", from);
                change.put("to", to);
                changes.put(key, change);
            }
        }
        return changes;
    }

    /** A row without the fields that have no meaning, with long texts cut. */
    public static Map<String, Object> clean(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (!NOISE.contains(entry.getKey())) {
                out.put(entry.getKey(), norm(entry.getValue()));
            }
        }
        return out;
    }

    /** A readable name for a row: name, title, first and last name, e-mail or key. */
    public static String labelOf(Map<String, Object> row) {
        for (String field : List.of("name", "title", "email", "key")) {
            Object value = row.get(field);
            if (value != null && !String.valueOf(value).isBlank()) {
                return truncate(String.valueOf(value), 200);
            }
        }
        String first = row.get("firstName") == null ? "" : String.valueOf(row.get("firstName"));
        String last = row.get("lastName") == null ? "" : String.valueOf(row.get("lastName"));
        String full = (first + " " + last).trim();
        return full.isEmpty() ? null : truncate(full, 200);
    }

    public Map<String, Object> parse(String json) {
        try {
            return JSON.readValue(json, new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (JsonProcessingException e) {
            return new LinkedHashMap<>();
        }
    }

    public List<Map<String, Object>> parseList(String json) {
        try {
            return JSON.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (JsonProcessingException e) {
            return new ArrayList<>();
        }
    }

    // ------------------------------------------------------------------ inside

    private void insertFromAuth(Authentication auth, String action, String entityType, String entityId,
                                String label, Map<String, Object> details) {
        UUID actorId = null;
        try {
            actorId = UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            // not a person we know
        }
        String name = null;
        if (actorId != null) {
            List<String> names = jdbc.queryForList("select name from users where id = ?", String.class, actorId);
            name = names.isEmpty() ? null : names.get(0);
        }
        insert(actorId, name, Roles.roleOf(auth), action, entityType, entityId, label, details);
    }

    private void insert(UUID actorId, String actorName, String actorRole, String action, String entityType,
                        String entityId, String label, Map<String, Object> details) {
        jdbc.update("insert into audit_log (actor_id, actor_name, actor_role, action, entity_type, entity_id, "
                + "entity_label, details, ip) values (?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?)",
            actorId, actorName, actorRole, truncate(action, 200), entityType, truncate(entityId, 200),
            truncate(label, 200), toJson(details), clientIp());
    }

    private String labelFor(String entityType, String entityId) {
        String sql = LABEL_SQL.get(entityType);
        if (sql == null) {
            return null;
        }
        try {
            List<String> labels = jdbc.queryForList(sql, String.class, entityId);
            return labels.isEmpty() ? null : labels.get(0);
        } catch (RuntimeException e) {
            return null; // not a valid id, or the row is gone: the entry just has no name
        }
    }

    private static List<String> variableNames(String pattern) {
        List<String> names = new ArrayList<>();
        Matcher matcher = VARIABLE.matcher(pattern == null ? "" : pattern);
        while (matcher.find()) {
            names.add(matcher.group(1));
        }
        return names;
    }

    private static String firstSegment(String pattern) {
        if (pattern == null) {
            return null;
        }
        String trimmed = pattern.startsWith("/") ? pattern.substring(1) : pattern;
        int slash = trimmed.indexOf('/');
        String segment = slash < 0 ? trimmed : trimmed.substring(0, slash);
        return segment.startsWith("{") ? null : segment;
    }

    private static Object norm(Object value) {
        if (value == null || value instanceof Number || value instanceof Boolean) {
            return value;
        }
        return truncate(String.valueOf(value), MAX_TEXT);
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max) + "...";
    }

    private static String toJson(Map<String, Object> details) {
        try {
            return JSON.writeValueAsString(details == null ? Map.of() : details);
        } catch (JsonProcessingException e) {
            log.warn("Could not write the details of an activity entry");
            return "{}";
        }
    }

    private static String clientIp() {
        try {
            RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
            if (attributes instanceof ServletRequestAttributes servlet) {
                HttpServletRequest request = servlet.getRequest();
                String ip = request.getHeader("CF-Connecting-IP");
                if (ip == null || ip.isBlank()) {
                    String forwarded = request.getHeader("X-Forwarded-For");
                    ip = forwarded == null ? null : forwarded.split(",")[0].trim();
                }
                if (ip == null || ip.isBlank()) {
                    ip = request.getRemoteAddr();
                }
                return truncate(ip, 64);
            }
        } catch (RuntimeException e) {
            // no request: no address
        }
        return null;
    }
}
