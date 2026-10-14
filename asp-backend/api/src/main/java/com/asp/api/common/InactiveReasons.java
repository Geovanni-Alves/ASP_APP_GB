package com.asp.api.common;

import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Why something was deactivated (a student, a staff member, a van). A reason from a short fixed list,
 * plus an optional note, is REQUIRED every time. The dashboard shows the same lists (src/lib/inactiveReasons.js).
 */
public final class InactiveReasons {

    public static final Set<String> STUDENT = Set.of(
        "Left the program", "Moved away", "Changed school", "Graduated / aged out", "Seasonal pause", "Other");

    public static final Set<String> STAFF = Set.of(
        "Resigned", "Contract ended", "Seasonal pause", "Dismissed", "Other");

    public static final Set<String> VAN = Set.of(
        "Sold", "Out of service (repairs)", "Retired", "Other");

    /** The reason and the note (null when empty), already checked. */
    public record Reason(String reason, String note) {}

    private InactiveReasons() {}

    /** Reads "reason" and "note" from the request body and checks them. Answers 400 when something is wrong. */
    public static Reason require(Set<String> allowed, Map<String, Object> body) {
        String reason = text(body.get("reason"));
        String note = text(body.get("note"));

        if (reason.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A reason is required");
        }
        if (!allowed.contains(reason)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown reason");
        }
        if (reason.equals("Other") && note.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please describe the reason");
        }
        if (note.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The note is too long (500 characters at most)");
        }
        return new Reason(reason, note.isEmpty() ? null : note);
    }

    private static String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
