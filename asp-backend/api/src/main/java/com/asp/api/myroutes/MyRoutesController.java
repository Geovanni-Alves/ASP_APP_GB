package com.asp.api.myroutes;

import com.asp.api.auth.ActAs;
import com.asp.api.auth.Roles;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * What the staff app needs about the routes of the person who is signed in.
 *
 *   GET /my/routes                  the routes sent to me (waiting to start, in progress...)
 *   GET /my/routes?type=pickup      only the pickup routes (or "dropoff")
 *   GET /my/routes?date=2026-10-14  the routes of one day (finished ones included)
 *
 * It replaces a long chain of queries of the old app. One answer has everything a screen needs:
 * the route, MY van(s) with the van, the driver, the helpers, and the kids of the stops (with
 * the school and today's attendance). Only the routes and vans where I am the driver or a helper
 * are returned, and a route that is still being planned is never shown: the manager has to send
 * it first.
 */
@RestController
@RequestMapping("/my")
public class MyRoutesController {

    private static final Set<String> TYPES = Set.of("pickup", "dropoff");

    // What the app may know about a colleague: never the password or the push tokens
    private static final String PERSON =
        "jsonb_build_object('id', u.id, 'name', u.name, 'photo', u.photo, "
            + "'phoneNumber', u.\"phoneNumber\", 'userType', u.\"userType\")";

    private static final String ROUTES_SQL = """
        with me as (
          select CAST(? AS uuid) as id, (now() at time zone CAST(? AS text))::date as today,
                 CAST(? AS boolean) as all_access
        )
        select coalesce(jsonb_agg(x.doc order by x.d, x.i), '[]'::jsonb)::text
        from (
          select r.date as d, r.id as i,
            to_jsonb(r) || jsonb_build_object(
              'when', case when r.date = me.today then 'today' when r.date > me.today then 'upcoming' else 'past' end,
              'vans', coalesce((
              select jsonb_agg(
                to_jsonb(rv) || jsonb_build_object(
                  'van', (select to_jsonb(v) from vans v where v.id = rv.van_id),
                  'driverUser', (select %1$s from users u where u.id = rv.driver_id),
                  'helperUsers', coalesce((
                    select jsonb_agg(%1$s order by u.name)
                    from users u where u.id = any(rv.helper_ids)), '[]'::jsonb),
                  'kids', coalesce((
                    select jsonb_agg(jsonb_build_object(
                        'stopId', rs.id,
                        'responsible_staff_id', rs.responsible_staff_id,
                        'kid', to_jsonb(s),
                        'school', to_jsonb(sc),
                        'attendance', (select to_jsonb(a) from student_attendance a
                                       where a.student_id = s.id and a.route_id = r.id limit 1)
                      ) order by rs.stop_order)
                    from route_stops rs
                    join students s on s.id = rs.student_id
                    left join schools sc on sc.id = s."schoolId"
                    where rs.route_van_id = rv.id), '[]'::jsonb)
                ) order by rv.created_at)
              from route_vans rv
              where rv.route_id = r.id
                and (me.all_access or rv.driver_id = me.id or me.id = any(rv.helper_ids))
            ), '[]'::jsonb)) as doc
          from routes r cross join me
          where %2$s
            and exists (select 1 from route_vans rv2
                        where rv2.route_id = r.id
                          and (me.all_access or rv2.driver_id = me.id or me.id = any(rv2.helper_ids)))
        ) x
        """;

    private final JdbcTemplate jdbc;
    private final String timezone;
    private final ActAs actAs;

    public MyRoutesController(JdbcTemplate jdbc,
                              @Value("${app.timezone:America/Vancouver}") String timezone,
                              ActAs actAs) {
        this.jdbc = jdbc;
        this.timezone = timezone;
        this.actAs = actAs;
    }

    @GetMapping("/routes")
    public ResponseEntity<String> routes(@RequestParam(required = false) String type,
                                         @RequestParam(required = false) String date,
                                         @RequestParam(required = false) Boolean all,
                                         Authentication auth) {
        Roles.requireStaffApp(auth);
        // The person the answer is for (the super admin may open the routes AS somebody: see ActAs)
        UUID userId = actAs.effectiveUser(auth);
        // Test mode: the super admin, when not acting as somebody, may ask for EVERY route (all=true)
        boolean everything = Boolean.TRUE.equals(all) && actAs.enabled() && Roles.isSuperAdmin(auth)
            && userId.toString().equals(auth.getName());

        if (type != null && !TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type must be pickup or dropoff");
        }

        List<Object> args = new ArrayList<>();
        args.add(userId);
        args.add(timezone);
        args.add(everything);

        // Which routes: by default the ones that were sent and are not over (today or later; one
        // that is still in progress shows up even if it started yesterday). With a date: that day.
        StringBuilder where = new StringBuilder();
        if (date != null) {
            try {
                LocalDate.parse(date);
            } catch (DateTimeParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The date must look like 2026-10-14");
            }
            where.append("r.date = CAST(? AS date) "
                + "and r.status in ('waiting_to_start', 'in_progress', 'paused', 'open', 'finished')");
            args.add(date);
        } else {
            where.append("r.status in ('waiting_to_start', 'in_progress', 'paused', 'open') "
                + "and (r.date >= me.today or r.status = 'in_progress')");
        }
        if (type != null) {
            where.append(" and r.type = ?");
            args.add(type);
        }

        String json = jdbc.queryForObject(ROUTES_SQL.formatted(PERSON, where), String.class, args.toArray());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
    }
}
