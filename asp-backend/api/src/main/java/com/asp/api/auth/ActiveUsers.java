package com.asp.api.auth;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Tells whether a user may still use the API. A token stays valid until it expires (hours), so without
 * this check a deactivated (or deleted) staff member could keep working with a token issued earlier.
 * The answer is cached for a few seconds so that most requests do not touch the database.
 */
@Component
public class ActiveUsers {

    private static final long CACHE_MILLIS = 15_000;

    private record Entry(boolean active, String role, long changedAt, long checkedAt) {}

    private final Map<UUID, Entry> cache = new ConcurrentHashMap<>();
    private final JdbcTemplate jdbc;

    public ActiveUsers(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isActive(UUID userId) {
        return activeRole(userId) != null;
    }

    /**
     * The role the person has NOW (read from the database, cached for a few seconds), or null when the
     * person is not active. The role of the token is not trusted: with a long session (days), a person
     * that was promoted or demoted must have the new role at once, not when the token expires.
     */
    public String activeRole(UUID userId) {
        long now = System.currentTimeMillis();
        Entry cached = cache.get(userId);
        if (cached == null || now - cached.checkedAt() >= CACHE_MILLIS) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "select active, \"userType\", extract(epoch from password_changed_at) as changed "
                    + "from users where id = ?", userId);
            // A user that no longer exists is not active either
            boolean active = !rows.isEmpty() && Boolean.TRUE.equals(rows.get(0).get("active"));
            String role = rows.isEmpty() ? null : (String) rows.get(0).get("userType");
            Object changed = rows.isEmpty() ? null : rows.get(0).get("changed");
            long changedAt = changed == null ? 0 : ((Number) changed).longValue();
            cached = new Entry(active, role, changedAt, now);
            cache.put(userId, cached);
        }
        return cached.active() ? (cached.role() == null ? "NONE" : cached.role()) : null;
    }

    /**
     * False when the token was issued BEFORE the last change of the password: the session was opened with the
     * old password (for example on a lost phone), so it stops working.
     */
    public boolean tokenIsCurrent(UUID userId, Date issuedAt) {
        activeRole(userId); // makes sure the answer is in the cache
        Entry entry = cache.get(userId);
        if (entry == null || entry.changedAt() == 0 || issuedAt == null) {
            return true;
        }
        return issuedAt.getTime() / 1000 >= entry.changedAt();
    }

    /** Called when a user is deactivated or reactivated, so the change takes effect at once. */
    public void forget(UUID userId) {
        cache.remove(userId);
    }
}
