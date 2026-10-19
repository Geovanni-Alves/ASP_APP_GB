package com.asp.api.audit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

/**
 * The safety net of the activity log: every write request (POST, PUT, PATCH, DELETE) of a signed-in
 * person that worked (or was refused with 403) is recorded, unless the code already wrote a detailed entry.
 * Left out on purpose: the sign-in (recorded by AuthController), the daily field work (check-ins,
 * the feed, messages and the van position are recorded in their own tables with the person's id),
 * a person editing their own profile, and file uploads (only deleting a file is recorded).
 */
@Component
public class AuditInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuditInterceptor.class);
    private static final Set<String> WRITES = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final List<String> SKIPPED = List.of("/auth/", "/my/", "/app/feeds", "/app/messages", "/users/me");

    private final AuditService audit;

    public AuditInterceptor(AuditService audit) {
        this.audit = audit;
    }

    @Override
    @SuppressWarnings("unchecked")
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
                                Exception ex) {
        try {
            String method = request.getMethod();
            if (!WRITES.contains(method) || audit.wasLogged()) {
                return;
            }
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return;
            }

            int status = response.getStatus();
            // Nothing happened when the request was refused for a bad value or a conflict;
            // a 403 is kept (somebody tried something they may not do)
            if (status >= 500 || (status >= 400 && status != 403)) {
                return;
            }

            String pattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            if (pattern == null) {
                return;
            }
            for (String prefix : SKIPPED) {
                if (pattern.startsWith(prefix)) {
                    return;
                }
            }
            if (pattern.startsWith("/files") && !method.equals("DELETE")) {
                return;
            }

            Map<String, String> vars =
                (Map<String, String>) request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
            audit.logRequest(auth, method, pattern, vars, status);
        } catch (RuntimeException e) {
            // The record is written after the work is done: a problem here never undoes it
            log.warn("Could not write the activity log: {}", e.getMessage());
        }
    }
}
