package com.asp.api.auth;

import java.util.Map;
import java.util.Set;

/**
 * Which roles may sign in to which app. The apps send their name when they log in
 * ("dashboard", "staff" or "parent"). This is a convenience and a second line of defence:
 * what a person may actually DO is always decided by the role on each endpoint (see Roles).
 */
public final class AppAccess {

    private static final Map<String, Set<String>> ALLOWED = Map.of(
        // the people who run the school
        "dashboard", Set.of("owner", "manager", "admin", "superadmin"),
        // a driver is also staff; the owner, the managers and the admins can drive and post photos too
        "staff", Set.of("staff", "driver", "admin", "manager", "owner", "superadmin"),
        // only the super admin may look at the parent app (for support and tests)
        "parent", Set.of("parent", "superadmin"));

    private AppAccess() {}

    public static boolean isKnown(String app) {
        return ALLOWED.containsKey(app);
    }

    public static boolean canUse(String app, String role) {
        Set<String> roles = ALLOWED.get(app);
        return roles != null && role != null && roles.contains(role.toLowerCase());
    }
}
