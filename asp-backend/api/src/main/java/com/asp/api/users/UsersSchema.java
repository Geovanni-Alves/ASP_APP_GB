package com.asp.api.users;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
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

    private final JdbcTemplate jdbc;

    public UsersSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("alter table users add column if not exists active boolean not null default true");
    }
}
