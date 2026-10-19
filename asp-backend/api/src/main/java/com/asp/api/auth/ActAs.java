package com.asp.api.auth;

import com.asp.api.audit.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

/**
 * Test mode for the programmer (the super admin): open the field routes AS a driver or a helper, to
 * test and to debug without making a second phone and a second account.
 *
 * The app sends the header "X-Act-As: <id of the person>". The routes of the field work (/my/...)
 * then answer as if that person had asked. The header is ONLY listened to when the signed-in person
 * is a super admin; for everybody else it is ignored. Whatever the super admin does as somebody
 * else is written to the activity log (which only the super admin can read, like the account itself).
 *
 * It can be turned off for production with the setting app.actas.enabled=false
 * (environment variable APP_ACTAS_ENABLED=false).
 */
@Component
public class ActAs {

    private static final String HEADER = "X-Act-As";

    private final JdbcTemplate jdbc;
    private final AuditService audit;
    private final boolean enabled;

    public ActAs(JdbcTemplate jdbc, AuditService audit, @Value("${app.actas.enabled:true}") boolean enabled) {
        this.jdbc = jdbc;
        this.audit = audit;
        this.enabled = enabled;
    }

    public boolean enabled() {
        return enabled;
    }

    /** The person a field request is for: the signed-in person, or (test mode) the one in the header. */
    public UUID effectiveUser(Authentication auth) {
        UUID real = UUID.fromString(auth.getName());
        String header = header();
        if (header == null || header.isBlank() || !enabled || !Roles.isSuperAdmin(auth)) {
            return real; // everybody else: the header means nothing
        }

        UUID target;
        try {
            target = UUID.fromString(header.trim());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Act-As must be the id of a person");
        }
        Integer found = jdbc.queryForObject(
            "select count(*) from users where id = ? and active "
                + "and lower(coalesce(\"userType\", '')) in ('staff', 'driver', 'admin', 'manager', 'owner')",
            Integer.class, target);
        if (found == null || found == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found");
        }
        return target;
    }

    /** Leaves a trace when the super admin did something AS somebody else. */
    public void trace(Authentication auth, String action, String entityType, Object entityId, UUID effective) {
        if (effective.toString().equals(auth.getName())) {
            return;
        }
        List<String> names = jdbc.queryForList("select name from users where id = ?", String.class, effective);
        String name = names.isEmpty() ? null : names.get(0);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("as", effective.toString());
        details.put("as_name", name);
        audit.log(auth, action, entityType, entityId, name, details);
    }

    private static String header() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servlet) {
            HttpServletRequest request = servlet.getRequest();
            return request.getHeader(HEADER);
        }
        return null;
    }
}
