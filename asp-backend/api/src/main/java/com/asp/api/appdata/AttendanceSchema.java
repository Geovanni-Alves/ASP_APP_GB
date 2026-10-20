package com.asp.api.appdata;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The check-out of a kid at the ASP (a parent picks the kid up): who took the kid. The table already
 * had when and by whom (the staff) the check-out was recorded.
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class AttendanceSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public AttendanceSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        // The name is kept as it was written that day; the contact is kept when the person is in the family
        jdbc.execute("alter table student_attendance add column if not exists picked_up_by text");
        jdbc.execute("alter table student_attendance add column if not exists picked_up_contact_id uuid "
            + "references contacts(id) on delete set null");
    }
}
