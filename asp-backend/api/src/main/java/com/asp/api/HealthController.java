package com.asp.api;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Smoke test: is the API up and able to reach the database?
    @GetMapping("/health")
    public Map<String, Object> health() {
        Integer tables = jdbc.queryForObject(
            "select count(*) from information_schema.tables where table_schema = 'public'",
            Integer.class);
        return Map.of("status", "ok", "tables", tables);
    }
}
