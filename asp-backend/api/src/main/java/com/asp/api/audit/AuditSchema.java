package com.asp.api.audit;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The activity log: who did what, and when. Rows are only ever ADDED: the database itself refuses to
 * change or delete them (and to empty the table), so nobody can erase their own trace by accident or on purpose.
 * Like the other schema runners, this stands in for proper migrations (Flyway), planned for later.
 */
@Component
@Order(0)
public class AuditSchema implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public AuditSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        // No foreign key on actor_id: the history stays even if a person is removed from the database.
        // actor_name and actor_role are copies, so the log says who the person WAS at that moment.
        jdbc.execute("""
            create table if not exists audit_log (
              id bigserial primary key,
              at timestamptz not null default now(),
              actor_id uuid,
              actor_name text,
              actor_role text,
              action text not null,
              entity_type text,
              entity_id text,
              entity_label text,
              details jsonb not null default '{}'::jsonb,
              ip text
            )""");
        jdbc.execute("create index if not exists idx_audit_at on audit_log (at desc)");
        jdbc.execute("create index if not exists idx_audit_actor on audit_log (actor_id, id desc)");
        jdbc.execute("create index if not exists idx_audit_entity on audit_log (entity_type, entity_id, id desc)");

        jdbc.execute("""
            create or replace function audit_log_readonly() returns trigger language plpgsql as $$
            begin
              raise exception 'The activity log cannot be changed';
            end $$""");
        jdbc.execute("drop trigger if exists audit_log_no_change on audit_log");
        jdbc.execute("create trigger audit_log_no_change before update or delete on audit_log "
            + "for each row execute function audit_log_readonly()");
        jdbc.execute("drop trigger if exists audit_log_no_truncate on audit_log");
        jdbc.execute("create trigger audit_log_no_truncate before truncate on audit_log "
            + "for each statement execute function audit_log_readonly()");
    }
}
