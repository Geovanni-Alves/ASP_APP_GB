package com.asp.api.invites;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Creates the "invites" table when the API starts (does nothing if it already exists).
 * Like AdminSeeder, this is a stand-in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class InviteSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public InviteSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        // The code itself is never stored, only a keyed hash of it (code_hash).
        jdbc.execute("""
            create table if not exists invites (
              id          uuid primary key default gen_random_uuid(),
              user_id     uuid not null references users(id) on delete cascade,
              contact_id  uuid references contacts(id) on delete set null,
              code_hash   text not null,
              expires_at  timestamptz not null,
              attempts    integer not null default 0,
              used_at     timestamptz,
              created_by  uuid references users(id) on delete set null,
              created_at  timestamptz not null default now()
            )
            """);
        jdbc.execute("create index if not exists idx_invites_user on invites (user_id)");
    }
}
