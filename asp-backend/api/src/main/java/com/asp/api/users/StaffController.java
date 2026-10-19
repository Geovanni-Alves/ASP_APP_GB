package com.asp.api.users;

import com.asp.api.audit.AuditService;
import com.asp.api.auth.ActiveUsers;
import com.asp.api.auth.Roles;
import com.asp.api.common.InactiveReasons;
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
 * People management for the dashboard (the list itself comes from GET /users).
 *
 *   POST  /staff                     register a new person (a user without a password yet)
 *   PATCH /staff/{id}                edit name, phone, address and type
 *   PUT   /staff/{id}/active         deactivate or reactivate (people are never deleted from the app)
 *   POST  /staff/{id}/invite         email the invite (the person sets a password)
 *
 * The rule is one (see Roles): only the owner and the managers manage people, and only people of a
 * LOWER level than their own. The owner creates managers, admins, staff and drivers; a manager
 * creates admins, staff and drivers; an admin creates nobody.
 */
@RestController
@RequestMapping("/staff")
public class StaffController {

    // Everybody who counts as part of the team here (lower case)
    private static final Set<String> TEAM =
        Set.of("staff", "driver", "admin", "manager", "owner", "superadmin");
    // Who can open the dashboard (staff and drivers only use the staff app)
    private static final Set<String> PORTAL_USERS = Set.of("owner", "manager", "admin", "superadmin");
    // The people who manage people: at least one of them must always be active
    private static final Set<String> PEOPLE_MANAGER_TYPES = Set.of("owner", "manager");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final JdbcTemplate jdbc;
    private final InviteService invites;
    private final ActiveUsers activeUsers;
    private final AuditService audit;

    public StaffController(JdbcTemplate jdbc, InviteService invites, ActiveUsers activeUsers, AuditService audit) {
        this.jdbc = jdbc;
        this.invites = invites;
        this.activeUsers = activeUsers;
        this.audit = audit;
    }

    // ------------------------------------------------------------------ create

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Authentication auth) {
        Roles.requirePeopleManager(auth);

        String name = text(body.get("name"));
        String email = text(body.get("email")).toLowerCase();
        if (name.isEmpty() || email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name and email are required");
        }
        if (!EMAIL.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
        }
        String type = assignableType(body.get("userType"), "STAFF", Roles.assignableTypes(Roles.roleOf(auth)));
        requireSingleOwner(type, null);

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

        Map<String, Object> createdDetails = new LinkedHashMap<>();
        createdDetails.put("type", type);
        createdDetails.put("email", email);
        audit.log(auth, "user.create", "users", created.get("id"), name, createdDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ------------------------------------------------------------------ edit

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody Map<String, Object> body,
                                      Authentication auth) {
        Roles.requirePeopleManager(auth);
        String currentType = requireTeamUser(id);
        requireCanManage(auth, currentType);

        Map<String, Object> before =
            jdbc.queryForMap("select " + UsersController.COLUMNS + " from users where id = ?", id);

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
            String newType = assignableType(body.get("userType"), currentType.toUpperCase(),
                Roles.assignableTypes(Roles.roleOf(auth)));
            if (!newType.equalsIgnoreCase(currentType)) {
                if (id.toString().equals(auth.getName())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot change your own account type");
                }
                requireSingleOwner(newType, id);
                // Moving the last owner or manager to another type would leave nobody to manage people
                if (PEOPLE_MANAGER_TYPES.contains(currentType) && !PEOPLE_MANAGER_TYPES.contains(newType.toLowerCase())
                    && !Roles.isSuperAdmin(auth) && !anotherPeopleManager(id)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This is the last active owner or manager: someone must be able to manage people.");
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
        Map<String, Object> after =
            jdbc.queryForMap("select " + UsersController.COLUMNS + " from users where id = ?", id);

        // The activity log: only what really changed, with the old and the new value
        Map<String, Object> changes = AuditService.diff(before, after);
        if (changes.isEmpty()) {
            audit.markLogged();
        } else {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("changes", changes);
            audit.log(auth, "user.update", "users", id, AuditService.labelOf(after), details);
        }
        return after;
    }

    // ------------------------------------------------------------------ deactivate / reactivate

    // Body: { "active": false }. Deactivating is blocked while the person works in an open route,
    // and nobody can deactivate themselves or the last active owner or manager.
    // A blocked request answers 409 { error, reasons: [...] }.
    @PutMapping("/{id}/active")
    public ResponseEntity<Map<String, Object>> setActive(@PathVariable UUID id,
                                                         @RequestBody Map<String, Object> body,
                                                         Authentication auth) {
        Roles.requirePeopleManager(auth);
        String type = requireTeamUser(id);
        requireCanManage(auth, type);

        if (!(body.get("active") instanceof Boolean)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "active must be true or false");
        }
        boolean active = (Boolean) body.get("active");

        InactiveReasons.Reason why = null;
        if (!active) {
            why = InactiveReasons.require(InactiveReasons.STAFF, body);
            if (id.toString().equals(auth.getName())) {
                return conflict("You cannot deactivate your own account.", null);
            }
            List<String> reasons = deactivationBlockers(id, type, Roles.isSuperAdmin(auth));
            if (!reasons.isEmpty()) {
                return conflict("This person cannot be deactivated yet.", reasons);
            }
        } else if (type.equals("owner")) {
            requireSingleOwner("OWNER", id); // there is only one active owner
        }

        if (why != null) {
            jdbc.update("update users set active = false, \"inactiveReason\" = ?, \"inactiveNote\" = ?, "
                + "\"inactiveSince\" = now(), updated_at = now() where id = ?", why.reason(), why.note(), id);
        } else {
            jdbc.update("update users set active = true, \"inactiveReason\" = null, \"inactiveNote\" = null, "
                + "\"inactiveSince\" = null, updated_at = now() where id = ?", id);
        }
        activeUsers.forget(id); // a deactivated person loses access right away

        Map<String, Object> details = new LinkedHashMap<>();
        if (why != null) {
            details.put("reason", why.reason());
            details.put("note", why.note());
        }
        audit.log(auth, active ? "user.reactivate" : "user.deactivate", "users", id, nameOf(id), details);

        Map<String, Object> ok = new LinkedHashMap<>();
        ok.put("active", active);
        return ResponseEntity.ok(ok);
    }

    // ------------------------------------------------------------------ invite

    @PostMapping("/{id}/invite")
    public Map<String, Object> invite(@PathVariable UUID id, Authentication auth) {
        Roles.requirePeopleManager(auth);
        requireCanManage(auth, requireTeamUser(id));
        Map<String, Object> result = invites.inviteStaff(id, UUID.fromString(auth.getName()));
        audit.log(auth, "user.invite", "users", id, nameOf(id), new LinkedHashMap<>());
        return result;
    }

    // ------------------------------------------------------------------ helpers

    // Why a person cannot be deactivated right now (an empty list means they can)
    private List<String> deactivationBlockers(UUID userId, String type, boolean actorIsSuperAdmin) {
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

        // Somebody has to be able to manage people (the superadmin can always step in)
        if (PEOPLE_MANAGER_TYPES.contains(type) && !actorIsSuperAdmin && !anotherPeopleManager(userId)) {
            reasons.add("This is the last active owner or manager: someone must be able to manage people.");
        }
        return reasons;
    }

    // Is there an active owner or manager besides this person?
    private boolean anotherPeopleManager(UUID userId) {
        Integer others = jdbc.queryForObject(
            "select count(*) from users where id <> ? and active and lower(coalesce(\"userType\", '')) in ('owner', 'manager')",
            Integer.class, userId);
        return others != null && others > 0;
    }

    // There is only one active owner (the database enforces it too)
    private void requireSingleOwner(String type, UUID exceptId) {
        if (!"OWNER".equalsIgnoreCase(type)) {
            return;
        }
        Integer others = jdbc.queryForObject(
            "select count(*) from users where active and lower(coalesce(\"userType\", '')) = 'owner' "
                + "and (CAST(? AS uuid) is null or id <> CAST(? AS uuid))",
            Integer.class, exceptId, exceptId);
        if (others != null && others > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "There is already an owner. Deactivate the current one first.");
        }
    }

    // The caller may only manage people of a lower level than their own
    private void requireCanManage(Authentication auth, String targetType) {
        if (!Roles.canManage(Roles.roleOf(auth), targetType)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot manage this account");
        }
    }

    // The account type of a team member (lower case); 404 for anybody who is not in the team (parents...)
    private String requireTeamUser(UUID id) {
        String type = typeOf(id);
        if (type == null || !TEAM.contains(type)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found");
        }
        return type;
    }

    private String nameOf(UUID id) {
        List<String> names = jdbc.queryForList("select name from users where id = ?", String.class, id);
        return names.isEmpty() ? null : names.get(0);
    }

    private String typeOf(UUID id) {
        List<String> types = jdbc.queryForList(
            "select lower(coalesce(\"userType\", '')) from users where id = ?", String.class, id);
        return types.isEmpty() ? null : types.get(0);
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
