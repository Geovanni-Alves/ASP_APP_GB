package com.asp.api.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Sends the pushes. The API is the one that sends (not the phones), through the push service of Expo, which
 * delivers to iPhone and Android with the same call. A phone that is no longer registered is forgotten.
 */
@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);
    private static final String EXPO_URL = "https://exp.host/--/api/v2/push/send";

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final Executor executor = Executors.newFixedThreadPool(2);
    private final String accessToken;

    public PushService(JdbcTemplate jdbc, @Value("${app.push.expo-access-token:}") String accessToken) {
        this.jdbc = jdbc;
        this.accessToken = accessToken == null ? "" : accessToken.trim();
    }

    /**
     * Sends in the background: whatever caused the push (a check-in, a route that was sent) never waits for
     * it, and a failure here never breaks it.
     */
    public void sendToUsers(Collection<UUID> userIds, String title, String body, Map<String, Object> data) {
        sendToUsersLater(userIds, title, body, data, 0);
    }

    public void sendToUsersLater(Collection<UUID> userIds, String title, String body, Map<String, Object> data,
                                 int delaySeconds) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }
        List<UUID> ids = List.copyOf(userIds);
        Executor later = delaySeconds > 0
            ? CompletableFuture.delayedExecutor(delaySeconds, TimeUnit.SECONDS, executor)
            : executor;
        later.execute(() -> {
            try {
                sendNow(ids, title, body, data);
            } catch (Exception e) {
                log.warn("Push failed: {}", e.getMessage());
            }
        });
    }

    /** Sends now and tells what happened (used by the test button, to see the real answer of Expo). */
    public Map<String, Object> sendNow(Collection<UUID> userIds, String title, String body, Map<String, Object> data)
        throws Exception {
        List<String> tokens = tokensOf(userIds);
        List<String> problems = new ArrayList<>();
        int sent = 0;

        for (int from = 0; from < tokens.size(); from += 100) {
            List<String> batch = tokens.subList(from, Math.min(from + 100, tokens.size()));
            List<Map<String, Object>> messages = new ArrayList<>();
            for (String token : batch) {
                Map<String, Object> message = new LinkedHashMap<>();
                message.put("to", token);
                message.put("title", title);
                message.put("body", body);
                message.put("sound", "default");
                message.put("priority", "high");
                message.put("channelId", "default");
                message.put("data", data == null ? Map.of() : data);
                messages.add(message);
            }

            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(EXPO_URL))
                .timeout(Duration.ofSeconds(20))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(messages)));
            if (!accessToken.isEmpty()) {
                request.header("Authorization", "Bearer " + accessToken);
            }

            HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(response.body());
            if (response.statusCode() >= 300 || !root.has("data")) {
                String text = response.body() == null ? "" : response.body();
                problems.add("Expo answered " + response.statusCode() + ": "
                    + text.substring(0, Math.min(200, text.length())));
                continue;
            }

            JsonNode tickets = root.get("data");
            for (int i = 0; i < tickets.size() && i < batch.size(); i++) {
                JsonNode ticket = tickets.get(i);
                if ("ok".equals(ticket.path("status").asText())) {
                    sent++;
                    continue;
                }
                String error = ticket.path("details").path("error").asText("");
                problems.add(ticket.path("message").asText(error));
                if ("DeviceNotRegistered".equals(error)) {
                    jdbc.update("delete from push_tokens where token = ?", batch.get(i)); // the phone is gone
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tokens", tokens.size());
        result.put("sent", sent);
        result.put("problems", problems);
        return result;
    }

    private List<String> tokensOf(Collection<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        String marks = String.join(", ", userIds.stream().map(id -> "?").toList());
        return jdbc.queryForList("select token from push_tokens where user_id in (" + marks + ")",
            String.class, userIds.toArray());
    }
}
