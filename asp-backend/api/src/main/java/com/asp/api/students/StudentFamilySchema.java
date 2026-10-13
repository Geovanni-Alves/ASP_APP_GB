package com.asp.api.students;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * "Primary contact" belongs to the LINK between a student and a contact (student_family), not to the
 * contact itself: the same parent can be the primary contact of one child and not of another.
 * This runner adds the column student_family.is_primary the first time the API starts, and fills it:
 *   1. contacts that were flagged as primary keep that role;
 *   2. a student with several primary contacts keeps only one;
 *   3. a student that has contacts but no primary gets one (the first contact).
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(1)
public class StudentFamilySchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public StudentFamilySchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        Integer exists = jdbc.queryForObject(
            "select count(*) from information_schema.columns "
                + "where table_schema = 'public' and table_name = 'student_family' and column_name = 'is_primary'",
            Integer.class);
        if (exists != null && exists > 0) {
            return; // already migrated: never touch the data again
        }

        jdbc.execute("alter table student_family add column is_primary boolean not null default false");

        // 1) keep what the dashboard already had
        jdbc.update("update student_family sf set is_primary = true from contacts c "
            + "where c.id = sf.contact_id and c.is_primary_contact = true");

        // 2) at most one primary per student
        jdbc.update("""
            update student_family sf set is_primary = false
            where sf.is_primary and (sf.student_id, sf.contact_id) not in (
              select distinct on (f.student_id) f.student_id, f.contact_id
              from student_family f
              where f.is_primary
              order by f.student_id, f.contact_id
            )
            """);

        // 3) at least one primary for every student that has contacts
        jdbc.update("""
            update student_family sf set is_primary = true
            where (sf.student_id, sf.contact_id) in (
              select distinct on (f.student_id) f.student_id, f.contact_id
              from student_family f
              where not exists (
                select 1 from student_family x where x.student_id = f.student_id and x.is_primary
              )
              order by f.student_id, f.contact_id
            )
            """);
    }
}
