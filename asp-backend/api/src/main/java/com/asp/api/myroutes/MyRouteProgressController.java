package com.asp.api.myroutes;

import com.asp.api.auth.Roles;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * How far the van is on its route. Only the DRIVER of the van does this.
 *
 *   POST /my/routes/{routeId}/start    the driver starts the route: waiting_to_start -> in_progress
 *                                      (the manager sees it in the dashboard, and the route is locked)
 *   PUT  /my/routes/{routeId}/leg      the driver arrived at a school: saves the number of the
 *                                      current leg, so the progress survives closing the app
 */
@RestController
@RequestMapping("/my/routes/{routeId}")
public class MyRouteProgressController {

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;

    public MyRouteProgressController(JdbcTemplate jdbc, TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.transaction = transaction;
    }

    @PostMapping("/start")
    public Map<String, Object> start(@PathVariable UUID routeId, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());

        return transaction.execute(txStatus -> {
            List<String> rows = jdbc.queryForList(
                "select status from routes where id = ? for update", String.class, routeId);
            if (rows.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found");
            }
            requireDriver(routeId, me);

            String status = rows.get(0);
            if (status.equals("waiting_to_start")) {
                jdbc.update("update routes set status = 'in_progress' where id = ?", routeId);
            } else if (!status.equals("in_progress")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is " + status + " and cannot be started");
            }
            return status("in_progress");
        });
    }

    public record LegUpdate(Integer index) {}

    @PutMapping("/leg")
    public Map<String, Object> leg(@PathVariable UUID routeId, @RequestBody LegUpdate body,
                                   Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = UUID.fromString(auth.getName());

        if (body.index() == null || body.index() < 0 || body.index() > 99) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "index must be between 0 and 99");
        }

        int updated = jdbc.update(
            "update route_vans rv set current_leg_index = ? "
                + "where rv.route_id = ? and rv.driver_id = ? "
                + "and exists (select 1 from routes r where r.id = rv.route_id "
                + "and r.status in ('waiting_to_start', 'in_progress'))",
            body.index(), routeId, me);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Only the driver of a van on this route can save its progress, while the route is sent or going");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("current_leg_index", body.index());
        return result;
    }

    private void requireDriver(UUID routeId, UUID userId) {
        Boolean isDriver = jdbc.queryForObject(
            "select exists (select 1 from route_vans where route_id = ? and driver_id = ?)",
            Boolean.class, routeId, userId);
        if (!Boolean.TRUE.equals(isDriver)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the driver of a van on this route can do this");
        }
    }

    private static Map<String, Object> status(String value) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", value);
        return body;
    }
}
