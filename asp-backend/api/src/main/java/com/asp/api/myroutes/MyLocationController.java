package com.asp.api.myroutes;

import com.asp.api.auth.ActAs;
import com.asp.api.auth.Roles;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Where the van is.
 *
 *   PUT /my/routes/{routeId}/location   body { "lat": 49.26, "lng": -123.10 }
 *
 * The phone of the DRIVER sends the position while the route is going. It is kept in the van of
 * that route (route_vans.lat, lng and location_at), so the dashboard and the parents' app can show
 * it. It works for pickup and drop-off routes alike.
 */
@RestController
@RequestMapping("/my/routes/{routeId}/location")
public class MyLocationController {

    private final JdbcTemplate jdbc;
    private final ActAs actAs;

    public MyLocationController(JdbcTemplate jdbc, ActAs actAs) {
        this.jdbc = jdbc;
        this.actAs = actAs;
    }

    public record LocationUpdate(Double lat, Double lng) {}

    @PutMapping
    public Map<String, Object> update(@PathVariable UUID routeId,
                                      @RequestBody LocationUpdate body,
                                      Authentication auth) {
        Roles.requireStaffApp(auth);
        UUID me = actAs.effectiveUser(auth); // the super admin may act as somebody (test mode)

        if (body.lat() == null || body.lng() == null
            || body.lat() < -90 || body.lat() > 90 || body.lng() < -180 || body.lng() > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat and lng must be real coordinates");
        }

        // Only the driver of a van of this route, and only while the route is sent or going
        int updated = jdbc.update(
            "update route_vans rv set lat = ?, lng = ?, location_at = now() "
                + "where rv.route_id = ? and rv.driver_id = ? "
                + "and exists (select 1 from routes r where r.id = rv.route_id "
                + "and r.status in ('waiting_to_start', 'in_progress'))",
            body.lat(), body.lng(), routeId, me);

        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Only the driver of a van on this route can send its location, while the route is sent or going");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("updated", updated);
        return result;
    }
}
