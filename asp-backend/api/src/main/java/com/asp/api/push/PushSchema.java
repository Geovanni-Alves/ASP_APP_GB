package com.asp.api.push;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The "addresses" of the phones that can receive a push: one row per phone (the Expo push token).
 * A phone belongs to ONE person at a time: when somebody else signs in on it, the row changes owner.
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class PushSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public PushSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("create table if not exists push_tokens ("
            + "token text primary key, "
            + "user_id uuid not null references users(id) on delete cascade, "
            + "platform text, "
            + "created_at timestamptz not null default now(), "
            + "updated_at timestamptz not null default now())");
        jdbc.execute("create index if not exists idx_push_tokens_user on push_tokens (user_id)");
    }
}
