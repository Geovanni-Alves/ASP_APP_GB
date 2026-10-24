package com.asp.api.auth;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The codes to reset a password (only a keyed hash of the code is kept), and the moment in which the password
 * of a person last changed: a session that began BEFORE that moment stops working (a lost phone is closed by
 * changing the password).
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class PasswordResetSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public PasswordResetSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("create table if not exists password_resets ("
            + "id uuid primary key default gen_random_uuid(), "
            + "user_id uuid not null references users(id) on delete cascade, "
            + "code_hash text not null, "
            + "expires_at timestamptz not null, "
            + "attempts int not null default 0, "
            + "used_at timestamptz, "
            + "created_at timestamptz not null default now())");
        jdbc.execute("create index if not exists idx_password_resets_user "
            + "on password_resets (user_id, created_at desc)");
        jdbc.execute("alter table users add column if not exists password_changed_at timestamptz");
    }
}
