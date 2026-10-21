package com.asp.api.planner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * There can be only one pickup route per day (and one drop-off route). The old database only had an
 * index, so two routes for the same day were possible and broke the planner. If duplicates already
 * exist the index cannot be created: the API still starts, and the log says what to clean up.
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(2)
public class PlannerSchema implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlannerSchema.class);

    private final JdbcTemplate jdbc;

    public PlannerSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        // The position of each van while its route is going (sent by the driver's phone)
        jdbc.execute("alter table route_vans add column if not exists lat double precision");
        jdbc.execute("alter table route_vans add column if not exists lng double precision");
        jdbc.execute("alter table route_vans add column if not exists location_at timestamptz");
        // When the driver finished the route with this van (the route closes when every van is finished)
        jdbc.execute("alter table route_vans add column if not exists finished_at timestamptz");
        // The schools the van already reached on the way BACK to the ASP (ids, in the order of arrival)
        jdbc.execute("alter table route_vans add column if not exists return_arrived jsonb not null default '[]'::jsonb");

        // Staff who cannot work on that day (the manager marks them in the planner)
        jdbc.execute("alter table routes add column if not exists staff_absents uuid[] not null default '{}'");

        try {
            jdbc.execute("create unique index if not exists uq_routes_date_type on routes (date, type)");
        } catch (DataAccessException e) {
            log.warn("Could not make (date, type) unique in routes: there are duplicate routes. "
                + "Find them with: select date, type, count(*) from routes group by date, type having count(*) > 1");
        }

        // One attendance row per kid and route (the staff app records check-in and absence there)
        try {
            jdbc.execute("create unique index if not exists uq_attendance_student_route "
                + "on student_attendance (student_id, route_id)");
        } catch (DataAccessException e) {
            log.warn("Could not make (student_id, route_id) unique in student_attendance: there are duplicates.");
        }
    }
}
