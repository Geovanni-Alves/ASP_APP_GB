package com.asp.api.invites;

import com.asp.api.auth.JwtService;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Parent invites.
 *
 *  invite(): staff invites a contact. We create a one-time code, store only a keyed hash of it,
 *            and email the code. Sending a new invite cancels the previous one.
 *  accept(): the parent enters email + code + a new password in the app. If everything is right
 *            the password is saved and the parent is logged in.
 */
@Service
public class InviteService {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0 or 1
    private static final int CODE_LENGTH = 8;
    private static final int VALID_DAYS = 7;
    private static final int MAX_ATTEMPTS = 5;
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final JdbcTemplate jdbc;
    private final MailService mail;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final byte[] secret;
    private final SecureRandom random = new SecureRandom();

    public InviteService(JdbcTemplate jdbc, MailService mail, PasswordEncoder encoder, JwtService jwt,
                         @Value("${app.jwt.secret}") String secret) {
        this.jdbc = jdbc;
        this.mail = mail;
        this.encoder = encoder;
        this.jwt = jwt;
        this.secret = ("invite:" + secret).getBytes(StandardCharsets.UTF_8);
    }

    // ------------------------------------------------------------------ invite

    // One transaction: if the email cannot be sent, the invite is not saved either.
    @Transactional
    public Map<String, Object> invite(UUID contactId, UUID invitedBy) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, \"firstName\", email, user_id from contacts where id = ?", contactId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact not found");
        }
        Map<String, Object> contact = rows.get(0);

        String email = text(contact.get("email"));
        if (email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This contact has no email address");
        }

        // The parent needs a user account (without a password yet)
        UUID userId = (UUID) contact.get("user_id");
        if (userId == null) {
            userId = findOrCreateParentUser(email, text(contact.get("firstName")));
            jdbc.update("update contacts set user_id = ? where id = ?", userId, contactId);
        }

        // A parent who already has a password (for example from a sibling) needs no code:
        // the child is already linked to the account, so it will show up after login.
        Boolean hasPassword = jdbc.queryForObject(
            "select password_hash is not null from users where id = ?", Boolean.class, userId);
        if (Boolean.TRUE.equals(hasPassword)) {
            jdbc.update("update contacts set signed = true where user_id = ?", userId);
            return Map.of("status", "already_registered");
        }

        // Only the newest invite works
        jdbc.update("update invites set used_at = now() where user_id = ? and used_at is null", userId);

        String code = generateCode();
        jdbc.update(
            "insert into invites (user_id, contact_id, code_hash, expires_at, created_by) "
                + "values (?, ?, ?, now() + make_interval(days => ?), ?)",
            userId, contactId, hash(userId, code), VALID_DAYS, invitedBy);

        mail.sendInvite(email, text(contact.get("firstName")), format(code), VALID_DAYS);

        jdbc.update("update users set invited = true where id = ?", userId);
        jdbc.update("update contacts set invited = true, signed = false where id = ?", contactId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "sent");
        result.put("validDays", VALID_DAYS);
        return result;
    }

    // ------------------------------------------------------------------ accept

    // A wrong code must still count as an attempt, so a ResponseStatusException does NOT roll back.
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public Map<String, Object> accept(String email, String rawCode, String password) {
        if (email == null || email.isBlank() || rawCode == null || rawCode.isBlank() || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email, code and password are required");
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "The password must have at least " + MIN_PASSWORD_LENGTH + " characters");
        }

        // Every failure below answers the same thing, so nothing reveals whether the email exists.
        List<Map<String, Object>> users = jdbc.queryForList(
            "select id, name, email, \"userType\" from users where lower(email) = lower(?)", email.trim());
        if (users.isEmpty()) {
            throw invalid();
        }
        Map<String, Object> user = users.get(0);
        UUID userId = (UUID) user.get("id");

        List<Map<String, Object>> invites = jdbc.queryForList(
            "select id, code_hash, attempts, (expires_at > now()) as valid "
                + "from invites where user_id = ? and used_at is null order by created_at desc limit 1",
            userId);
        if (invites.isEmpty()) {
            throw invalid();
        }
        Map<String, Object> invite = invites.get(0);
        UUID inviteId = (UUID) invite.get("id");
        int attempts = ((Number) invite.get("attempts")).intValue();

        if (attempts >= MAX_ATTEMPTS || !Boolean.TRUE.equals(invite.get("valid"))) {
            throw invalid();
        }

        byte[] expected = String.valueOf(invite.get("code_hash")).getBytes(StandardCharsets.UTF_8);
        byte[] given = hash(userId, normalize(rawCode)).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, given)) {
            jdbc.update("update invites set attempts = attempts + 1 where id = ?", inviteId);
            throw invalid();
        }

        // Correct code: save the password, close the invite, mark the contacts as registered
        jdbc.update("update users set password_hash = ?, updated_at = now() where id = ?",
            encoder.encode(password), userId);
        jdbc.update("update invites set used_at = now() where id = ?", inviteId);
        jdbc.update("update contacts set signed = true where user_id = ?", userId);

        String role = text(user.get("userType"));
        Map<String, Object> publicUser = new LinkedHashMap<>();
        publicUser.put("id", userId);
        publicUser.put("name", user.get("name"));
        publicUser.put("email", user.get("email"));
        publicUser.put("userType", role);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", jwt.generate(userId, text(user.get("email")), role));
        result.put("user", publicUser);
        return result;
    }

    // ------------------------------------------------------------------ helpers

    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired invitation");
    }

    private UUID findOrCreateParentUser(String email, String firstName) {
        List<UUID> found = jdbc.queryForList(
            "select id from users where lower(email) = lower(?) limit 1", UUID.class, email);
        if (!found.isEmpty()) {
            return found.get(0);
        }
        return jdbc.queryForObject(
            "insert into users (name, email, \"userType\", \"firstLogin\", updated_at) "
                + "values (?, ?, 'parent', true, now()) returning id",
            UUID.class, firstName, email);
    }

    private String generateCode() {
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }

    // K7M29QXA -> K7M2-9QXA (easier to read and type)
    private static String format(String code) {
        return code.substring(0, 4) + "-" + code.substring(4);
    }

    // The parent may type lower case, spaces or the dash
    private static String normalize(String rawCode) {
        return rawCode.toUpperCase().replaceAll("[^A-Z0-9]", "");
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
