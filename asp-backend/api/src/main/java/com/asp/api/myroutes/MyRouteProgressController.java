package com.asp.api.myroutes;

import com.asp.api.audit.AuditService;
import com.asp.api.auth.ActAs;
import com.asp.api.auth.Roles;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
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
 *   POST /my/routes/{routeId}/finish   the driver finished the route with their van (only after the
 *                                      last school). When every van is finished, the route is
 *                                      finished: in_progress -> finished
 */
@RestController
@RequestMapping("/my/routes/{routeId}")
public class MyRouteProgressController {

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final String timezone;
    private final AuditService audit;
    private final ActAs actAs;

    public MyRouteProgressController(JdbcTemplate jdbc, TransactionTemplate transaction,
                                     @Value("${app.timezone:America/Vancouver}") String timezone,
                                     AuditService audit, ActAs actAs) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.timezone = timezone;
        this.audit = audit;
        this.actAs = actAs;
    }

    @PostMapping("/start")
    public Map<String, Object> start(@PathVariable UUID routeId, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = actAs.effectiveUser(auth); // the super admin may act as somebody (test mode)

        return transaction.execute(txStatus -> {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "select status, date from routes where id = ? for update", routeId);
            if (rows.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found");
            }
            requireDriver(routeId, me);

            // Only on the day of the route (by the clock of the server)
            LocalDate routeDate = ((java.sql.Date) rows.get(0).get("date")).toLocalDate();
            if (!routeDate.equals(LocalDate.now(ZoneId.of(timezone)))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is for " + routeDate + ": it can only be started on the day");
            }

            String status = String.valueOf(rows.get(0).get("status"));
            if (status.equals("waiting_to_start")) {
                jdbc.update("update routes set status = 'in_progress' where id = ?", routeId);
            } else if (!status.equals("in_progress")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is " + status + " and cannot be started");
            }
            audit.log(auth, "route.start", "routes", routeId, String.valueOf(routeDate), new LinkedHashMap<>());
            return status("in_progress");
        });
    }

    @PostMapping("/finish")
    public Map<String, Object> finish(@PathVariable UUID routeId, Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = actAs.effectiveUser(auth); // the super admin may act as somebody (test mode)

        return transaction.execute(txStatus -> {
            List<Map<String, Object>> routes = jdbc.queryForList(
                "select status, date from routes where id = ? for update", routeId);
            if (routes.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found");
            }
            requireDriver(routeId, me);

            LocalDate routeDate = ((java.sql.Date) routes.get(0).get("date")).toLocalDate();
            if (!routeDate.equals(LocalDate.now(ZoneId.of(timezone)))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is for " + routeDate + ": it can only be finished on the day");
            }
            String routeStatus = String.valueOf(routes.get(0).get("status"));
            if (routeStatus.equals("finished")) {
                return status("finished"); // already done: nothing to repeat
            }
            if (!routeStatus.equals("in_progress")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This route is " + routeStatus + ": it has not started");
            }

            // My van: I must have arrived at every school
            List<Map<String, Object>> vans = jdbc.queryForList(
                "select id, coalesce(current_leg_index, 0) as leg, coalesce(array_length(school_order, 1), 0) as schools, "
                    + "finished_at from route_vans where route_id = ? and driver_id = ?", routeId, me);
            Map<String, Object> van = vans.get(0);
            if (van.get("finished_at") == null) {
                if (((Number) van.get("leg")).intValue() < ((Number) van.get("schools")).intValue()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "You have not arrived at every school yet");
                }
                jdbc.update("update route_vans set finished_at = now() where id = ?", van.get("id"));
            }

            // The route closes when every van with a driver is finished
            Integer remaining = jdbc.queryForObject(
                "select count(*) from route_vans where route_id = ? and driver_id is not null and finished_at is null",
                Integer.class, routeId);
            boolean routeFinished = remaining != null && remaining == 0;
            if (routeFinished) {
                jdbc.update("update routes set status = 'finished' where id = ?", routeId);
            }

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("route_finished", routeFinished);
            audit.log(auth, "route.finish", "routes", routeId, String.valueOf(routeDate), details);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("status", routeFinished ? "finished" : "van_finished");
            body.put("vans_left", remaining == null ? 0 : remaining);
            return body;
        });
    }

    public record LegUpdate(Integer index) {}

    @PutMapping("/leg")
    public Map<String, Object> leg(@PathVariable UUID routeId, @RequestBody LegUpdate body,
                                   Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = actAs.effectiveUser(auth); // the super admin may act as somebody (test mode)

        if (body.index() == null || body.index() < 0 || body.index() > 99) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "index must be between 0 and 99");
        }

        int updated = jdbc.update(
            "update route_vans rv set current_leg_index = ? "
                + "where rv.route_id = ? and rv.driver_id = ? "
                + "and exists (select 1 from routes r where r.id = rv.route_id "
                + "and r.status in ('waiting_to_start', 'in_progress') "
                + "and r.date = (now() at time zone CAST(? AS text))::date)",
            body.index(), routeId, me, timezone);
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
