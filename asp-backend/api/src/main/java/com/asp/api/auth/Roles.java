package com.asp.api.auth;

import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

/**
 * Small helper for role checks. Roles come from the "userType" column and may be
 * stored with different casing ("Staff", "STAFF", "SuperAdmin"...), so we compare in lower case.
 *
 * Who is who:
 *   superadmin  the owner/developer: everything, including the parent app and erasing a student
 *   admin       the ASP manager: the dashboard, plus the staff app (can drive and post photos)
 *   staff       the staff app only
 *   driver      the staff app only; a driver is also a member of the staff
 *   parent      the parent app only
 * The login also checks which APP a role may use (see AppAccess).
 */
public final class Roles {

    // Who may use the dashboard and the management endpoints of the API
    private static final Set<String> MANAGER_ROLES = Set.of("admin", "superadmin");

    private Roles() {}

    private static String roleOf(GrantedAuthority authority) {
        String a = authority.getAuthority();
        return (a.startsWith("ROLE_") ? a.substring(5) : a).toLowerCase();
    }

    /** Throws 403 unless the authenticated user is an administrator (admin or superadmin). */
    public static void requireManager(Authentication auth) {
        boolean isManager = auth.getAuthorities().stream()
            .map(Roles::roleOf)
            .anyMatch(MANAGER_ROLES::contains);

        if (!isManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access required");
        }
    }

    /** Throws 403 unless the user's role may use the staff app (staff, driver, admin, superadmin). */
    public static void requireStaffApp(Authentication auth) {
        boolean allowed = auth.getAuthorities().stream()
            .map(Roles::roleOf)
            .anyMatch(role -> AppAccess.canUse("staff", role));

        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account cannot use the staff app");
        }
    }

    /** True when the authenticated user is a super admin (the owner / developer account). */
    public static boolean isSuperAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(Roles::roleOf)
            .anyMatch("superadmin"::equals);
    }

    /** Throws 403 unless the authenticated user is a super admin (used to erase a student for good). */
    public static void requireSuperAdmin(Authentication auth) {
        if (!isSuperAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Students are never deleted from the app. Set the status to Inactive instead.");
        }
    }
}
