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
        try {
            jdbc.execute("create unique index if not exists uq_routes_date_type on routes (date, type)");
        } catch (DataAccessException e) {
            log.warn("Could not make (date, type) unique in routes: there are duplicate routes. "
                + "Find them with: select date, type, count(*) from routes group by date, type having count(*) > 1");
        }
    }
}
