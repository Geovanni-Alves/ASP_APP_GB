package com.asp.api.auth;

import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

/**
 * Small helper for role checks. Roles come from the "userType" column and may be
 * stored with different casing ("Staff", "STAFF", "SuperAdmin"...), so we compare in lower case.
 */
public final class Roles {

    private static final Set<String> STAFF_ROLES = Set.of("staff", "superadmin", "admin");

    private Roles() {}

    /** Throws 403 unless the authenticated user is staff or an admin. */
    public static void requireStaff(Authentication auth) {
        boolean isStaff = auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
            .map(String::toLowerCase)
            .anyMatch(STAFF_ROLES::contains);

        if (!isStaff) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Staff access required");
        }
    }
}
