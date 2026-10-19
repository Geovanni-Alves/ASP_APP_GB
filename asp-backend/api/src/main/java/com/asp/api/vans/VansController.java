package com.asp.api.vans;

import com.asp.api.audit.AuditService;
import com.asp.api.auth.Roles;
import com.asp.api.common.InactiveReasons;
import com.asp.api.files.FileStorage;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Vans. Listing, creating and editing a van use the generic endpoints (GET/POST/PATCH /vans).
 * What has rules lives here:
 *
 *   GET    /vans/usage          which vans have been used (they cannot be deleted)
 *   PUT    /vans/{id}/active    deactivate (with a reason, for example "Sold") or reactivate
 *   DELETE /vans/{id}           only a van that was NEVER used (a mistake). A van with route history
 *                               is deactivated instead: deleting it would also erase its routes
 *                               (route_vans has "on delete cascade").
 */
@RestController
@RequestMapping("/vans")
public class VansController {

    private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9._-]{1,200}$");

    // Every place that points to a van. A van that appears in any of them has history.
    private static final String USAGE_SQL =
        "select van_id as id from route_vans "
            + "union select \"vanId\" from students where \"vanId\" is not null "
            + "union select \"vanId\" from week_day_routes where \"vanId\" is not null "
            + "union select \"vanId\" from drop_off_route where \"vanId\" is not null";

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final FileStorage storage;
    private final AuditService audit;

    public VansController(JdbcTemplate jdbc, TransactionTemplate transaction, FileStorage storage,
                          AuditService audit) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.storage = storage;
        this.audit = audit;
    }

    // ------------------------------------------------------------------ usage

    @GetMapping("/usage")
    public Map<String, Object> usage(Authentication auth) {
        Roles.requireManager(auth);
        List<UUID> ids = jdbc.queryForList(USAGE_SQL, UUID.class);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("inUse", ids);
        return result;
    }

    // ------------------------------------------------------------------ deactivate / reactivate

    // Body: { "active": false, "reason": "Sold", "note": "..." } or { "active": true }
    @PutMapping("/{vanId}/active")
    public ResponseEntity<Map<String, Object>> setActive(@PathVariable UUID vanId,
                                                         @RequestBody Map<String, Object> body,
                                                         Authentication auth) {
        Roles.requireManager(auth);
        requireVan(vanId);

        if (!(body.get("active") instanceof Boolean)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "active must be true or false");
        }
        boolean active = (Boolean) body.get("active");

        if (!active) {
            InactiveReasons.Reason why = InactiveReasons.require(InactiveReasons.VAN, body);

            List<String> reasons = deactivationBlockers(vanId);
            if (!reasons.isEmpty()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "This van cannot be deactivated yet.");
                error.put("reasons", reasons);
                return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
            }
            jdbc.update("update vans set active = false, \"inactiveReason\" = ?, \"inactiveNote\" = ?, "
                + "\"inactiveSince\" = now() where id = ?", why.reason(), why.note(), vanId);
        } else {
            jdbc.update("update vans set active = true, \"inactiveReason\" = null, \"inactiveNote\" = null, "
                + "\"inactiveSince\" = null where id = ?", vanId);
        }

        List<String> vanNames = jdbc.queryForList("select name from vans where id = ?", String.class, vanId);
        Map<String, Object> details = new LinkedHashMap<>();
        if (!active) {
            details.put("reason", body.get("reason"));
            details.put("note", body.get("note"));
        }
        audit.log(auth, active ? "van.reactivate" : "van.deactivate", "vans", vanId,
            vanNames.isEmpty() ? null : vanNames.get(0), details);

        Map<String, Object> ok = new LinkedHashMap<>();
        ok.put("active", active);
        return ResponseEntity.ok(ok);
    }

    // ------------------------------------------------------------------ delete (only a van that was never used)

    @DeleteMapping("/{vanId}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable UUID vanId, Authentication auth) {
        Roles.requireManager(auth);

        List<String> namesBefore = jdbc.queryForList("select name from vans where id = ?", String.class, vanId);
        String vanName = namesBefore.isEmpty() ? null : namesBefore.get(0);

        // Lock the van, check and delete in ONE transaction. A route that is being created for this van
        // at the same moment has to wait for us, so a route can never be erased by the cascade.
        String[] image = new String[1];
        Boolean deleted = transaction.execute(status -> {
            List<String> rows = jdbc.queryForList(
                "select coalesce(image, '') from vans where id = ? for update", String.class, vanId);
            if (rows.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Van not found");
            }
            Integer uses = jdbc.queryForObject(
                "select count(*) from (" + USAGE_SQL + ") u where u.id = ?", Integer.class, vanId);
            if (uses != null && uses > 0) {
                return false;
            }
            image[0] = rows.get(0);
            jdbc.update("delete from vans where id = ?", vanId);
            return true;
        });

        if (!Boolean.TRUE.equals(deleted)) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "This van has route history, so it cannot be deleted. Deactivate it instead.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        // The data is gone; now remove the photo (best effort)
        if (image[0] != null && SAFE_NAME.matcher(image[0]).matches()) {
            try {
                storage.delete("vans", image[0]);
            } catch (IOException | RuntimeException e) {
                // a photo that cannot be removed does not undo the deletion
            }
        }

        audit.log(auth, "van.delete", "vans", vanId, vanName, new LinkedHashMap<>());

        Map<String, Object> ok = new LinkedHashMap<>();
        ok.put("deleted", 1);
        return ResponseEntity.ok(ok);
    }

    // ------------------------------------------------------------------ helpers

    private void requireVan(UUID vanId) {
        Integer exists = jdbc.queryForObject("select count(*) from vans where id = ?", Integer.class, vanId);
        if (exists == null || exists == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Van not found");
        }
    }

    // Why a van cannot be deactivated right now (an empty list means it can).
    // Students only ride a van when a route is run, so only open routes matter.
    private List<String> deactivationBlockers(UUID vanId) {
        List<String> reasons = new ArrayList<>();

        List<Map<String, Object>> routes = jdbc.queryForList(
            "select r.date, r.type, r.status "
                + "from route_vans rv join routes r on r.id = rv.route_id "
                + "where rv.van_id = ? and r.status <> 'finished' and r.date >= current_date "
                + "order by r.date",
            vanId);
        for (Map<String, Object> route : routes) {
            reasons.add("Used in an open " + route.get("type") + " route on " + route.get("date")
                + " (" + route.get("status") + ").");
        }
        return reasons;
    }
}
