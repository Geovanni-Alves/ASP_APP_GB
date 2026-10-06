package com.asp.api.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Roda ao iniciar a API:
 *  1) garante que a tabela users tenha a coluna password_hash;
 *  2) cria o primeiro administrador (ADMIN_EMAIL / ADMIN_PASSWORD) se ele ainda nao existir.
 * Mais tarde isso sera substituido por migrations (Flyway).
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminSeeder(JdbcTemplate jdbc, PasswordEncoder encoder,
                       @Value("${app.admin.email:}") String adminEmail,
                       @Value("${app.admin.password:}") String adminPassword) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("alter table users add column if not exists password_hash text");

        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            return;
        }
        Integer exists = jdbc.queryForObject(
            "select count(*) from users where lower(email) = lower(?)", Integer.class, adminEmail.trim());
        if (exists != null && exists > 0) {
            return; // nunca sobrescreve um usuario existente
        }
        jdbc.update(
            "insert into users (name, email, \"userType\", password_hash, invited, \"firstLogin\") values (?, ?, ?, ?, true, false)",
            "Admin", adminEmail.trim(), "STAFF", encoder.encode(adminPassword));
    }
}
