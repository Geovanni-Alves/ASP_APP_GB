package com.asp.api.users;

import com.asp.api.auth.Roles;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/users")
public class UsersController {

    // Columns returned to clients. Deliberately NOT included:
    //   password_hash        -> must never leave the API
    //   "pushToken", "fcmToken" -> device tokens, not needed by the dashboard
    private static final String COLUMNS =
        "id, sub, name, email, \"unitNumber\", address, lng, lat, "
        + "\"phoneNumber\", \"userType\", photo, updated_at, \"firstLogin\", invited";

    // Profile fields a user may change about THEMSELVES, with their SQL kind.
    // "userType", "email", "invited" and the password are deliberately NOT here,
    // otherwise any user could promote themselves to admin.
    private static final Map<String, String> SELF_EDITABLE = Map.of(
        "name", "text",
        "phoneNumber", "text",
        "address", "text",
        "unitNumber", "text",
        "photo", "text",
        "lat", "number",
        "lng", "number");

    private final JdbcTemplate jdbc;

    public UsersController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // GET /users -> every user (staff and admins only)
    @GetMapping
    public List<Map<String, Object>> list(Authentication auth) {
        Roles.requireStaff(auth);
        return jdbc.queryForList("select " + COLUMNS + " from users order by lower(name)");
    }

    // GET /users/me -> the profile of the logged-in user (any role)
    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        UUID id = UUID.fromString(auth.getName());
        List<Map<String, Object>> rows =
            jdbc.queryForList("select " + COLUMNS + " from users where id = ?", id);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        return rows.get(0);
    }

    // PATCH /users/me -> the logged-in user completes or edits their OWN profile.
    // Sending "firstLogin" (any value) marks the profile as completed (firstLogin = false).
    @PatchMapping("/me")
    public Map<String, Object> updateMe(@RequestBody Map<String, Object> body, Authentication auth) {
        UUID id = UUID.fromString(auth.getName());

        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            String field = entry.getKey();
            Object value = entry.getValue();

            if (field.equals("firstLogin")) {
                continue; // handled below
            }
            String kind = SELF_EDITABLE.get(field);
            if (kind == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field cannot be changed: " + field);
            }
            if (kind.equals("text")) {
                if (value != null && !(value instanceof String)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be text");
                }
                args.add(value);
            } else {
                if (value != null && !(value instanceof Number)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a number");
                }
                args.add(value == null ? null : ((Number) value).doubleValue());
            }
            // "field" is safe to put in SQL: it was found in the whitelist above.
            sets.add("\"" + field + "\" = ?");
        }

        boolean completesProfile = body.containsKey("firstLogin");
        if (sets.isEmpty() && !completesProfile) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nothing to update");
        }
        if (completesProfile) {
            sets.add("\"firstLogin\" = false");
        }
        sets.add("updated_at = now()");
        args.add(id);

        List<Map<String, Object>> rows = jdbc.queryForList(
            "update users set " + String.join(", ", sets) + " where id = ? returning " + COLUMNS,
            args.toArray());
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        return rows.get(0);
    }
}
