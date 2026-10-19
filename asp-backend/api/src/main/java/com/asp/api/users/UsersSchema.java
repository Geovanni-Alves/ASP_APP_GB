package com.asp.api.users;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Adds users.active (true for everybody that already exists). A staff member who leaves is
 * deactivated, never deleted: their history (routes, posts) stays, but they can no longer sign in.
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class UsersSchema implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UsersSchema.class);

    private final JdbcTemplate jdbc;

    public UsersSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("alter table users add column if not exists active boolean not null default true");
        // Why and since when a staff member was deactivated
        jdbc.execute("alter table users add column if not exists \"inactiveReason\" text");
        jdbc.execute("alter table users add column if not exists \"inactiveNote\" text");
        jdbc.execute("alter table users add column if not exists \"inactiveSince\" timestamptz");

        // There is only ONE active owner: the database refuses a second one
        try {
            jdbc.execute("create unique index if not exists uq_one_active_owner on users ((true)) "
                + "where lower(coalesce(\"userType\", '')) = 'owner' and active");
        } catch (DataAccessException e) {
            log.warn("Could not make the owner unique: there is more than one active owner already.");
        }
    }
}
