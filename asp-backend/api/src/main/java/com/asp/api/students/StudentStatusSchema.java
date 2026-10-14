package com.asp.api.students;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Adds the "why" and "since when" of an archived student. Like the other schema runners, this stands in
 * for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class StudentStatusSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public StudentStatusSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("alter table students add column if not exists \"inactiveReason\" text");
        jdbc.execute("alter table students add column if not exists \"inactiveNote\" text");
        jdbc.execute("alter table students add column if not exists \"inactiveSince\" timestamptz");
    }
}
