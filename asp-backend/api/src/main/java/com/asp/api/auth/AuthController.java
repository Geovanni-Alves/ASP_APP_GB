package com.asp.api.auth;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    public record LoginRequest(String email, String password) {}

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder encoder, JwtService jwt) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {
        if (req == null || req.email() == null || req.password() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and password are required");
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, name, email, \"userType\", password_hash from users where lower(email) = lower(?)",
            req.email().trim());

        // Same response for "user not found" and "wrong password" (does not reveal which one it was).
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        Map<String, Object> u = rows.get(0);
        String hash = (String) u.get("password_hash");
        if (hash == null || !encoder.matches(req.password(), hash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        UUID id = (UUID) u.get("id");
        String role = (String) u.get("userType");
        String token = jwt.generate(id, (String) u.get("email"), role);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("token", token);
        out.put("user", publicUser(u));
        return out;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        UUID id = UUID.fromString(auth.getName());
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, name, email, \"userType\" from users where id = ?", id);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User no longer exists");
        }
        return publicUser(rows.get(0));
    }

    private Map<String, Object> publicUser(Map<String, Object> u) {
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", u.get("id"));
        user.put("name", u.get("name"));
        user.put("email", u.get("email"));
        user.put("userType", u.get("userType"));
        return user;
    }
}
