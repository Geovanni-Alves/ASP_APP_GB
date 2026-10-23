package com.asp.api.parent;

import com.asp.api.push.PushService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Tells the family of a kid when something is posted in the news of the kid (arrived, picked up, a photo, an
 * incident...). It is called right after the news item is saved. It never breaks what called it: a push that
 * fails changes nothing.
 *
 * What shows on the lock screen is short and calm. An incident does NOT show its text there (only that there
 * is one): the details are read inside the app.
 */
@Service
public class FamilyNotifier {

    private final JdbcTemplate jdbc;
    private final PushService push;

    public FamilyNotifier(JdbcTemplate jdbc, PushService push) {
        this.jdbc = jdbc;
        this.push = push;
    }

    /** type: ATTENDANCE, PHOTO, VIDEO, ACTIVITY, PROMOTION, INCIDENT. notes: the text of the item (may be null). */
    public void feedPosted(UUID studentId, String type, String notes, int mediaCount) {
        try {
            // The accounts of the family of this kid (only the contacts that have an account)
            List<UUID> parents = jdbc.queryForList(
                "select distinct c.user_id from student_family sf join contacts c on c.id = sf.contact_id "
                    + "where sf.student_id = ? and c.user_id is not null",
                UUID.class, studentId);
            if (parents.isEmpty()) {
                return;
            }
            List<String> names = jdbc.queryForList(
                "select split_part(name, ' ', 1) from students where id = ?", String.class, studentId);
            String kid = names.isEmpty() ? "Your child" : names.get(0);
            String note = notes == null ? "" : notes.trim();
            String preview = note.length() > 100 ? note.substring(0, 100) + "…" : note;

            String title;
            String body;
            switch (type == null ? "" : type) {
                case "ATTENDANCE" -> {
                    title = kid;
                    body = preview.isEmpty() ? "There is an update" : preview;
                }
                case "PHOTO" -> {
                    title = mediaCount > 1 ? mediaCount + " new photos of " + kid : "New photo of " + kid;
                    body = preview.isEmpty() ? "Open the app to see it" : preview;
                }
                case "VIDEO" -> {
                    title = "New video of " + kid;
                    body = preview.isEmpty() ? "Open the app to see it" : preview;
                }
                case "ACTIVITY" -> {
                    title = "New activity for " + kid;
                    body = preview.isEmpty() ? "Open the app to see it" : preview;
                }
                case "PROMOTION" -> {
                    title = "New promotion for " + kid;
                    body = preview.isEmpty() ? "Open the app to see it" : preview;
                }
                case "INCIDENT" -> {
                    title = kid;
                    body = "There is an incident report. Open the app to read it.";
                }
                default -> {
                    title = kid;
                    body = "There is an update";
                }
            }

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("type", "feed");
            data.put("studentId", studentId.toString());
            data.put("feedType", type);
            push.sendToUsers(parents, title, body, data);
        } catch (Exception e) {
            // the news item is saved: a push that fails changes nothing
        }
    }
}
