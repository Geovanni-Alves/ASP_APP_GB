package com.asp.api.auth;

import com.asp.api.audit.AuditService;
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

    public record LoginRequest(String email, String password, String app) {}

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuditService audit;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder encoder, JwtService jwt, AuditService audit) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.jwt = jwt;
        this.audit = audit;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {
        if (req == null || req.email() == null || req.password() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and password are required");
        }
        // Each app says what it is ("dashboard", "staff", "parent"); the role must be allowed to use it
        String app = req.app() == null ? "" : req.app().trim().toLowerCase();

        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, name, email, \"userType\", password_hash, active from users where lower(email) = lower(?)",
            req.email().trim());

        // Same response for "user not found" and "wrong password" (does not reveal which one it was).
        if (rows.isEmpty()) {
            audit.loginFailed(req.email(), app, "invalid_credentials");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        Map<String, Object> u = rows.get(0);
        String hash = (String) u.get("password_hash");
        if (hash == null || !encoder.matches(req.password(), hash)) {
            audit.loginFailed(req.email(), app, "invalid_credentials");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        // The password was right, but this account was switched off by the staff
        if (Boolean.FALSE.equals(u.get("active"))) {
            audit.loginFailed(req.email(), app, "account_disabled");
            throw new AuthProblem(HttpStatus.FORBIDDEN, "account_disabled", "This account has been disabled");
        }

        UUID id = (UUID) u.get("id");
        String role = (String) u.get("userType");

        if (!app.isEmpty()) {
            if (!AppAccess.isKnown(app)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown app");
            }
            // if (!AppAccess.canUse(app, role)) {
            //     audit.loginFailed(req.email(), app, "app_not_allowed");
            //     throw new AuthProblem(HttpStatus.FORBIDDEN, "app_not_allowed",
            //         "This account cannot use this app");
            // }
            if (!AppAccess.canUse(app, role)) {
                audit.loginFailed(req.email(), app, "app_not_allowed");

                if ("parent".equalsIgnoreCase(role)
                        && "dashboard".equalsIgnoreCase(app)) {
                    throw new AuthProblem(
                        HttpStatus.FORBIDDEN,
                        "parent_app_required",
                        "Parents must use the User app"
                    );
                }

                throw new AuthProblem(
                    HttpStatus.FORBIDDEN,
                    "app_not_allowed",
                    "This account cannot use this app"
                );
            }
        }

        String token = jwt.generate(id, (String) u.get("email"), role);
        audit.loginOk(id, (String) u.get("name"), role, app, "login");

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
