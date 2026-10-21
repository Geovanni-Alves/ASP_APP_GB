package com.asp.api.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expiryMs;       // the dashboard: a few hours
    private final long mobileExpiryMs; // the staff and parent apps on a phone: days (it renews when the app opens)

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiry-hours:12}") long expiryHours,
                      @Value("${app.jwt.mobile-expiry-days:30}") long mobileExpiryDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryMs = expiryHours * 3600_000L;
        this.mobileExpiryMs = mobileExpiryDays * 24 * 3600_000L;
    }

    public String generate(UUID userId, String email, String role) {
        return generate(userId, email, role, null);
    }

    /** "app" is "dashboard", "staff" or "parent": the phones' apps get a longer session. */
    public String generate(UUID userId, String email, String role, String app) {
        boolean mobile = "staff".equals(app) || "parent".equals(app);
        Date now = new Date();
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("role", role)
            .claim("app", app == null || app.isBlank() ? null : app)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + (mobile ? mobileExpiryMs : expiryMs)))
            .signWith(key)
            .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
