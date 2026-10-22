package com.asp.api.push;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The phone says "this is my address" (the Expo push token) when the app opens, and takes it back when the
 * person signs out. Everybody who is signed in can do it, for their own phone only.
 *
 *   POST   /push/register   { token, platform }   registers this phone for the signed-in person
 *   DELETE /push/register   { token }             this phone stops receiving the pushes of the person
 *   POST   /push/test       { delaySeconds? }     sends a test push to the phones of the signed-in person
 */
@RestController
@RequestMapping("/push")
public class PushController {

    private static final Pattern EXPO_TOKEN = Pattern.compile("^Expo(nent)?PushToken\\[[^\\]]+\\]$");

    public record Register(String token, String platform) {}

    public record Test(Integer delaySeconds) {}

    private final JdbcTemplate jdbc;
    private final PushService push;

    public PushController(JdbcTemplate jdbc, PushService push) {
        this.jdbc = jdbc;
        this.push = push;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Register body, Authentication auth) {
        UUID me = UUID.fromString(auth.getName());
        String token = body.token() == null ? "" : body.token().trim();
        if (!EXPO_TOKEN.matcher(token).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That is not an Expo push token");
        }
        String platform = body.platform() == null ? null : body.platform().trim().toLowerCase();

        // The phone belongs to the person who is signed in on it NOW
        jdbc.update("insert into push_tokens (token, user_id, platform) values (?, ?, ?) "
                + "on conflict (token) do update set user_id = excluded.user_id, "
                + "platform = excluded.platform, updated_at = now()",
            token, me, platform);

        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("status", "registered");
        return answer;
    }

    @DeleteMapping("/register")
    public Map<String, Object> unregister(@RequestBody Register body, Authentication auth) {
        UUID me = UUID.fromString(auth.getName());
        if (body.token() != null) {
            jdbc.update("delete from push_tokens where token = ? and user_id = ?", body.token().trim(), me);
        }
        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("status", "unregistered");
        return answer;
    }

    @PostMapping("/test")
    public Map<String, Object> test(@RequestBody(required = false) Test body, Authentication auth) throws Exception {
        UUID me = UUID.fromString(auth.getName());
        int delay = body == null || body.delaySeconds() == null ? 0 : Math.max(0, Math.min(body.delaySeconds(), 60));
        Map<String, Object> data = Map.of("type", "test");

        if (delay > 0) {
            // Later, so the person can lock the phone and see it arrive like a real one
            Integer tokens = jdbc.queryForObject("select count(*) from push_tokens where user_id = ?", Integer.class, me);
            push.sendToUsersLater(List.of(me), "ASP test", "If you see this, push works on this phone ✔", data, delay);
            Map<String, Object> answer = new LinkedHashMap<>();
            answer.put("tokens", tokens);
            answer.put("scheduled_in_seconds", delay);
            return answer;
        }
        return push.sendNow(List.of(me), "ASP test", "If you see this, push works on this phone ✔", data);
    }
}
