package com.asp.api.users;

import com.asp.api.auth.ActiveUsers;
import com.asp.api.auth.Roles;
import com.asp.api.invites.InviteService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Staff management for the dashboard (the list itself comes from GET /users).
 *
 *   POST  /staff                     register a new staff member (a user without a password yet)
 *   PATCH /staff/{id}                edit name, phone, address and type (Staff or Driver)
 *   PUT   /staff/{id}/active         deactivate or reactivate (staff are never deleted from the app)
 *   POST  /staff/{id}/invite         email the invite code (the person sets a password in the app)
 */
@RestController
@RequestMapping("/staff")
public class StaffController {

    // The account types that can be chosen in the dashboard. Only a super admin can also pick ADMIN
    // (the ASP manager, who uses the dashboard).
    // Everybody who counts as "staff" here (lower case)
    private static final Set<String> STAFF_LIKE = Set.of("staff", "driver", "admin", "superadmin");
    // Who can open the dashboard (staff and drivers only use the staff app)
    private static final Set<String> PORTAL_USERS = Set.of("admin", "superadmin");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final JdbcTemplate jdbc;
    private final InviteService invites;
    private final ActiveUsers activeUsers;

    public StaffController(JdbcTemplate jdbc, InviteService invites, ActiveUsers activeUsers) {
        this.jdbc = jdbc;
        this.invites = invites;
        this.activeUsers = activeUsers;
    }

    // ------------------------------------------------------------------ create

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Authentication auth) {
        Roles.requireManager(auth);

        String name = text(body.get("name"));
        String email = text(body.get("email")).toLowerCase();
        if (name.isEmpty() || email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name and email are required");
        }
        if (!EMAIL.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
        }
        String type = assignableType(body.get("userType"), "STAFF", assignableFor(auth));

        // Never turn an existing account (for example a parent) into staff by accident
        Integer taken = jdbc.queryForObject(
            "select count(*) from users where lower(email) = ?", Integer.class, email);
        if (taken != null && taken > 0) {
            return conflict("This email is already registered.", null);
        }

        Map<String, Object> created = jdbc.queryForMap(
            "insert into users (name, email, \"phoneNumber\", address, \"userType\", \"firstLogin\", invited, "
                + "active, updated_at) values (?, ?, ?, ?, ?, true, false, true, now()) returning "
                + UsersController.COLUMNS,
            name, email, blankToNull(body.get("phoneNumber")), blankToNull(body.get("address")), type);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ------------------------------------------------------------------ edit

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody Map<String, Object> body,
                                      Authentication auth) {
        Roles.requireManager(auth);
        String currentType = requireStaffUser(id);
        protectPrivileged(currentType, auth);

        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();

        if (body.containsKey("name")) {
            String name = text(body.get("name"));
            if (name.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The name cannot be empty");
            }
            sets.add("name = ?");
            args.add(name);
        }
        if (body.containsKey("phoneNumber")) {
            sets.add("\"phoneNumber\" = ?");
            args.add(blankToNull(body.get("phoneNumber")));
        }
        if (body.containsKey("address")) {
            sets.add("address = ?");
            args.add(blankToNull(body.get("address")));
        }
        if (body.containsKey("userType")) {
            String newType = assignableType(body.get("userType"), currentType.toUpperCase(), assignableFor(auth));
            if (!newType.equalsIgnoreCase(currentType)) {
                // A super admin account keeps its type, and nobody changes their own
                if (!assignableFor(auth).contains(currentType.toUpperCase())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "The type of this account cannot be changed here");
                }
                if (id.toString().equals(auth.getName())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot change your own account type");
                }
                sets.add("\"userType\" = ?");
                args.add(newType);
            }
        }

        if (!sets.isEmpty()) {
            sets.add("updated_at = now()");
            args.add(id);
            jdbc.update("update users set " + String.join(", ", sets) + " where id = ?", args.toArray());
        }
        return jdbc.queryForMap("select " + UsersController.COLUMNS + " from users where id = ?", id);
    }

    // ------------------------------------------------------------------ deactivate / reactivate

    // Body: { "active": false }. Deactivating is blocked while the person works in an open route,
    // and nobody can deactivate themselves or the last active staff member.
    // A blocked request answers 409 { error, reasons: [...] }.
    @PutMapping("/{id}/active")
    public ResponseEntity<Map<String, Object>> setActive(@PathVariable UUID id,
                                                         @RequestBody Map<String, Object> body,
                                                         Authentication auth) {
        Roles.requireManager(auth);
        protectPrivileged(requireStaffUser(id), auth);

        if (!(body.get("active") instanceof Boolean)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "active must be true or false");
        }
        boolean active = (Boolean) body.get("active");

        if (!active) {
            if (id.toString().equals(auth.getName())) {
                return conflict("You cannot deactivate your own account.", null);
            }
            List<String> reasons = deactivationBlockers(id);
            if (!reasons.isEmpty()) {
                return conflict("This staff member cannot be deactivated yet.", reasons);
            }
        }

        jdbc.update("update users set active = ?, updated_at = now() where id = ?", active, id);
        activeUsers.forget(id); // a deactivated person loses access right away

        Map<String, Object> ok = new LinkedHashMap<>();
        ok.put("active", active);
        return ResponseEntity.ok(ok);
    }

    // ------------------------------------------------------------------ invite

    @PostMapping("/{id}/invite")
    public Map<String, Object> invite(@PathVariable UUID id, Authentication auth) {
        Roles.requireManager(auth);
        protectPrivileged(requireStaffUser(id), auth);
        return invites.inviteStaff(id, UUID.fromString(auth.getName()));
    }

    // ------------------------------------------------------------------ helpers

    // Why a staff member cannot be deactivated right now (an empty list means they can)
    private List<String> deactivationBlockers(UUID userId) {
        List<String> reasons = new ArrayList<>();

        List<Map<String, Object>> routes = jdbc.queryForList(
            "select r.date, r.type, r.status, v.name as van "
                + "from route_vans rv "
                + "join routes r on r.id = rv.route_id "
                + "left join vans v on v.id = rv.van_id "
                + "where (rv.driver_id = ? or ? = any(rv.helper_ids)) "
                + "and r.status <> 'finished' and r.date >= current_date "
                + "order by r.date",
            userId, userId);
        for (Map<String, Object> route : routes) {
            String van = route.get("van") == null ? "" : ", van " + route.get("van");
            reasons.add("Assigned to an open " + route.get("type") + " route on " + route.get("date")
                + " (" + route.get("status") + van + ").");
        }

        // Somebody has to be able to sign in to the dashboard
        Integer others = jdbc.queryForObject(
            "select count(*) from users where id <> ? and active and lower(\"userType\") in ('admin', 'superadmin')",
            Integer.class, userId);
        boolean isPortalUser = PORTAL_USERS.contains(typeOf(userId));
        if (isPortalUser && (others == null || others == 0)) {
            reasons.add("This is the last active administrator: someone must be able to use the dashboard.");
        }
        return reasons;
    }

    // Admin and SuperAdmin accounts can only be managed by a SuperAdmin (a regular staff member
    // must not be able to edit, deactivate or invite the owner).
    private void protectPrivileged(String type, Authentication auth) {
        boolean privileged = type.equals("admin") || type.equals("superadmin");
        if (privileged && !Roles.isSuperAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only a super admin can manage this account");
        }
    }

    // The account type of a staff member (lower case); 404 for anybody who is not staff (parents...)
    private String requireStaffUser(UUID id) {
        String type = typeOf(id);
        if (type == null || !STAFF_LIKE.contains(type)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Staff member not found");
        }
        return type;
    }

    private String typeOf(UUID id) {
        List<String> types = jdbc.queryForList(
            "select lower(coalesce(\"userType\", '')) from users where id = ?", String.class, id);
        return types.isEmpty() ? null : types.get(0);
    }

    // The types the caller may assign. A driver is also staff; ADMIN is the ASP manager.
    private static Set<String> assignableFor(Authentication auth) {
        return Roles.isSuperAdmin(auth) ? Set.of("STAFF", "DRIVER", "ADMIN") : Set.of("STAFF", "DRIVER");
    }

    private static String assignableType(Object raw, String fallback, Set<String> allowed) {
        String value = text(raw).toUpperCase();
        if (value.isEmpty()) {
            return fallback;
        }
        if (!allowed.contains(value) && !value.equals(fallback)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This account type cannot be assigned");
        }
        return value;
    }

    private static ResponseEntity<Map<String, Object>> conflict(String message, List<String> reasons) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("error", message);
        if (reasons != null) {
            error.put("reasons", reasons);
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    private static String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private static String blankToNull(Object value) {
        String text = text(value);
        return text.isEmpty() ? null : text;
    }
}
