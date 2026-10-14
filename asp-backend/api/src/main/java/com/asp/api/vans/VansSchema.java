package com.asp.api.vans;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Adds vans.active (true for every van that already exists). A van that leaves service is deactivated,
 * never deleted: deleting a van would also erase its routes (route_vans has "on delete cascade").
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class VansSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public VansSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("alter table vans add column if not exists active boolean not null default true");
        // Why and since when a van was deactivated (for example "Sold")
        jdbc.execute("alter table vans add column if not exists \"inactiveReason\" text");
        jdbc.execute("alter table vans add column if not exists \"inactiveNote\" text");
        jdbc.execute("alter table vans add column if not exists \"inactiveSince\" timestamptz");
    }
}
