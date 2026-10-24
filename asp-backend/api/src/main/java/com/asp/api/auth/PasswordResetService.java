package com.asp.api.auth;

import com.asp.api.invites.MailService;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * "I forgot my password":
 *   request(): the person types the e-mail. A code of 6 digits is e-mailed (valid for 30 minutes, 5 attempts).
 *              The answer is ALWAYS the same, so nobody can find out which e-mails have an account.
 *   reset():   e-mail + code + a new password. When it is right the password changes, every session that was
 *              open before is closed, and the person is signed in with a new one.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private static final int VALID_MINUTES = 30;
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_REQUESTS_PER_HOUR = 3;
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final JdbcTemplate jdbc;
    private final MailService mail;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final byte[] secret;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(JdbcTemplate jdbc, MailService mail, PasswordEncoder encoder, JwtService jwt,
                                @Value("${app.jwt.secret}") String secret) {
        this.jdbc = jdbc;
        this.mail = mail;
        this.encoder = encoder;
        this.jwt = jwt;
        this.secret = ("reset:" + secret).getBytes(StandardCharsets.UTF_8);
    }

    /** Sends the code when the e-mail has an account that may use this app. It never says if it did. */
    public void request(String email, String app) {
        try {
            if (email == null || email.isBlank()) {
                return;
            }
            List<Map<String, Object>> users = jdbc.queryForList(
                "select id, name, email, \"userType\", active, (password_hash is not null) as registered "
                    + "from users where lower(email) = lower(?)", email.trim());
            if (users.isEmpty()) {
                return;
            }
            Map<String, Object> user = users.get(0);
            // Somebody who never chose a password uses the invite, not this
            if (!Boolean.TRUE.equals(user.get("active")) || !Boolean.TRUE.equals(user.get("registered"))) {
                return;
            }
            String role = text(user.get("userType"));
            String appName = cleanApp(app);
            if (!appName.isEmpty() && (!AppAccess.isKnown(appName) || !AppAccess.canUse(appName, role))) {
                return;
            }

            UUID userId = (UUID) user.get("id");
            Integer recent = jdbc.queryForObject(
                "select count(*) from password_resets where user_id = ? and created_at > now() - interval '1 hour'",
                Integer.class, userId);
            if (recent != null && recent >= MAX_REQUESTS_PER_HOUR) {
                return; // too many in a row
            }

            // A new code cancels the previous one
            jdbc.update("update password_resets set used_at = now() where user_id = ? and used_at is null", userId);
            String code = String.format("%06d", random.nextInt(1_000_000));
            jdbc.update("insert into password_resets (user_id, code_hash, expires_at) "
                    + "values (?, ?, now() + (CAST(? AS int) * interval '1 minute'))",
                userId, hash(userId, code), VALID_MINUTES);

            String name = text(user.get("name"));
            String firstName = name.isEmpty() ? "" : name.split(" ")[0];
            mail.sendPasswordReset(text(user.get("email")), firstName, code, VALID_MINUTES);
        } catch (Exception e) {
            log.warn("Password reset request failed: {}", e.getMessage());
        }
    }

    // A wrong code must still count as an attempt, so a ResponseStatusException does NOT roll back.
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public Map<String, Object> reset(String email, String rawCode, String password, String app) {
        if (email == null || email.isBlank() || rawCode == null || rawCode.isBlank() || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email, code and password are required");
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "The password must have at least " + MIN_PASSWORD_LENGTH + " characters");
        }

        // Every failure answers the same, so nothing reveals whether the e-mail exists
        List<Map<String, Object>> users = jdbc.queryForList(
            "select id, name, email, \"userType\", active from users where lower(email) = lower(?)", email.trim());
        if (users.isEmpty() || Boolean.FALSE.equals(users.get(0).get("active"))) {
            throw invalid();
        }
        Map<String, Object> user = users.get(0);
        UUID userId = (UUID) user.get("id");
        String role = text(user.get("userType"));
        String appName = cleanApp(app);
        if (!appName.isEmpty() && (!AppAccess.isKnown(appName) || !AppAccess.canUse(appName, role))) {
            throw invalid();
        }

        List<Map<String, Object>> resets = jdbc.queryForList(
            "select id, code_hash, attempts, (expires_at > now()) as valid from password_resets "
                + "where user_id = ? and used_at is null order by created_at desc limit 1", userId);
        if (resets.isEmpty()) {
            throw invalid();
        }
        Map<String, Object> reset = resets.get(0);
        UUID resetId = (UUID) reset.get("id");
        int attempts = ((Number) reset.get("attempts")).intValue();
        if (attempts >= MAX_ATTEMPTS || !Boolean.TRUE.equals(reset.get("valid"))) {
            throw invalid();
        }

        byte[] expected = String.valueOf(reset.get("code_hash")).getBytes(StandardCharsets.UTF_8);
        byte[] given = hash(userId, rawCode.replaceAll("[^0-9]", "")).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, given)) {
            jdbc.update("update password_resets set attempts = attempts + 1 where id = ?", resetId);
            throw invalid();
        }

        // Right: the new password, the sessions that were open stop working, the code is used up
        jdbc.update("update users set password_hash = ?, password_changed_at = now(), updated_at = now() "
            + "where id = ?", encoder.encode(password), userId);
        jdbc.update("update password_resets set used_at = now() where user_id = ? and used_at is null", userId);

        Map<String, Object> publicUser = new LinkedHashMap<>();
        publicUser.put("id", userId);
        publicUser.put("name", user.get("name"));
        publicUser.put("email", user.get("email"));
        publicUser.put("userType", role);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", jwt.generate(userId, text(user.get("email")), role, appName));
        result.put("user", publicUser);
        return result;
    }

    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired code");
    }

    private static String cleanApp(String app) {
        return app == null ? "" : app.trim().toLowerCase();
    }

    // Keyed hash (HMAC): even someone who reads the database cannot rebuild the codes
    private String hash(UUID userId, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((userId + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
