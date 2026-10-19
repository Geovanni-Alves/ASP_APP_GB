package com.asp.api.auth;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

/**
 * Who is who. Roles come from the "userType" column and may be stored with different casing
 * ("Staff", "STAFF", "SuperAdmin"...), so we compare in lower case.
 *
 *   superadmin  the programmer: everything, sees everything (and nobody else sees this account)
 *   owner       the owner of the business: ONE person. Creates and deactivates managers, admins,
 *               staff and drivers
 *   manager     creates and deactivates admins, staff and drivers
 *   admin       a trusted person: the same work in the dashboard as a manager, but does not create
 *               or deactivate people
 *   staff       the staff app only
 *   driver      the staff app only (a driver is also staff)
 *   parent      the parent app only
 *
 * The rule for people is one: you only manage people of a LOWER level than yours, and only the
 * superadmin, the owner and the managers manage people at all.
 * The login also checks which APP a role may use (see AppAccess).
 */
public final class Roles {

    // The level of each role: a person only manages people of a lower level
    private static final Map<String, Integer> LEVELS = Map.of(
        "superadmin", 5, "owner", 4, "manager", 3, "admin", 2, "staff", 1, "driver", 1);

    // Who may use the dashboard and the management endpoints of the API (students, vans, planner...)
    private static final Set<String> DASHBOARD_ROLES = Set.of("owner", "manager", "admin", "superadmin");

    // Who may create, edit, invite and deactivate people
    private static final Set<String> PEOPLE_MANAGERS = Set.of("owner", "manager", "superadmin");

    private Roles() {}

    private static String roleOf(GrantedAuthority authority) {
        String a = authority.getAuthority();
        return (a.startsWith("ROLE_") ? a.substring(5) : a).toLowerCase();
    }

    /** The role of the authenticated user in lower case (the highest one, if there are several). */
    public static String roleOf(Authentication auth) {
        String best = "";
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String role = roleOf(authority);
            if (levelOf(role) > levelOf(best)) {
                best = role;
            }
        }
        return best;
    }

    /** The level of a role (0 for a role that is not part of the team, like a parent). */
    public static int levelOf(String role) {
        return role == null ? 0 : LEVELS.getOrDefault(role.toLowerCase(), 0);
    }

    /** Throws 403 unless the user works in the dashboard (owner, manager, admin or superadmin). */
    public static void requireManager(Authentication auth) {
        boolean allowed = auth.getAuthorities().stream()
            .map(Roles::roleOf)
            .anyMatch(DASHBOARD_ROLES::contains);

        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Dashboard access required");
        }
    }

    /** Throws 403 unless the user may create and deactivate people (owner, manager or superadmin). */
    public static void requirePeopleManager(Authentication auth) {
        if (!PEOPLE_MANAGERS.contains(roleOf(auth))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Only the owner and the managers can manage people");
        }
    }

    /** True when somebody with this role may manage (create, edit, invite, deactivate) that role. */
    public static boolean canManage(String actorRole, String targetRole) {
        return actorRole != null
            && PEOPLE_MANAGERS.contains(actorRole.toLowerCase())
            && levelOf(targetRole) > 0
            && levelOf(targetRole) < levelOf(actorRole);
    }

    /** The account types (UPPER CASE) that somebody with this role may give to a person. */
    public static Set<String> assignableTypes(String actorRole) {
        Set<String> types = new LinkedHashSet<>();
        for (String role : LEVELS.keySet()) {
            if (canManage(actorRole, role)) {
                types.add(role.toUpperCase());
            }
        }
        return types;
    }

    /** Throws 403 unless the user's role may use the staff app. */
    public static void requireStaffApp(Authentication auth) {
        boolean allowed = auth.getAuthorities().stream()
            .map(Roles::roleOf)
            .anyMatch(role -> AppAccess.canUse("staff", role));

        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account cannot use the staff app");
        }
    }

    /** True when the authenticated user is a super admin (the programmer). */
    public static boolean isSuperAdmin(Authentication auth) {
        return "superadmin".equals(roleOf(auth));
    }

    /** Throws 403 unless the authenticated user is a super admin (used to erase a student for good). */
    public static void requireSuperAdmin(Authentication auth) {
        if (!isSuperAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Students are never deleted from the app. Set the status to Inactive instead.");
        }
    }
}
