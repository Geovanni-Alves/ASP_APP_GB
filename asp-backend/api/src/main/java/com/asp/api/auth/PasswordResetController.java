package com.asp.api.auth;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "I forgot my password" (open endpoints: the person is not signed in).
 *   POST /auth/forgot-password   { email, app }                    -> always { status: "sent" }
 *   POST /auth/reset-password    { email, code, password, app }    -> { token, user } (signed in)
 */
@RestController
@RequestMapping("/auth")
public class PasswordResetController {

    public record ForgotRequest(String email, String app) {}

    public record ResetRequest(String email, String code, String password, String app) {}

    private final PasswordResetService service;

    public PasswordResetController(PasswordResetService service) {
        this.service = service;
    }

    @PostMapping("/forgot-password")
    public Map<String, Object> forgot(@RequestBody ForgotRequest body) {
        service.request(body.email(), body.app());
        return Map.of("status", "sent");
    }

    @PostMapping("/reset-password")
    public Map<String, Object> reset(@RequestBody ResetRequest body) {
        return service.reset(body.email(), body.code(), body.password(), body.app());
    }
}
