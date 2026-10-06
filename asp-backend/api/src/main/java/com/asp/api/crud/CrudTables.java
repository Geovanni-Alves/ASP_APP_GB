package com.asp.api.crud;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tables exposed through the generic CRUD endpoints.
 * Key   = URL name (same as the table name), e.g. GET /vans
 * Value = primary key column, or null when the table has a composite key.
 *
 * This is a whitelist: a table that is not listed here can NOT be reached through the generic API.
 * "users" is intentionally missing (it holds password hashes and has its own controller).
 */
public final class CrudTables {

    public static final Map<String, String> PRIMARY_KEYS = new LinkedHashMap<>();

    static {
        PRIMARY_KEYS.put("vans", "id");
        PRIMARY_KEYS.put("schools", "id");
        PRIMARY_KEYS.put("events", "id");
        PRIMARY_KEYS.put("settings", "key");
        PRIMARY_KEYS.put("contacts", "id");
        PRIMARY_KEYS.put("students", "id");
        PRIMARY_KEYS.put("students_address", "id");
        PRIMARY_KEYS.put("students_schedule", "id");
        PRIMARY_KEYS.put("student_details", "id");
        PRIMARY_KEYS.put("student_family", null); // composite key (student_id, contact_id)
        PRIMARY_KEYS.put("pictures", "id");
        PRIMARY_KEYS.put("message", "id");
        PRIMARY_KEYS.put("kidFeeds", "id");
        PRIMARY_KEYS.put("routes", "id");
        PRIMARY_KEYS.put("route_vans", "id");
        PRIMARY_KEYS.put("route_stops", "id");
        PRIMARY_KEYS.put("student_attendance", "id");
        PRIMARY_KEYS.put("week_day_routes", "id");
        PRIMARY_KEYS.put("drop_off_route", "id");
        PRIMARY_KEYS.put("drop_off_address_order", "id");
    }

    private CrudTables() {}

    public static boolean exists(String table) {
        return PRIMARY_KEYS.containsKey(table);
    }
}
