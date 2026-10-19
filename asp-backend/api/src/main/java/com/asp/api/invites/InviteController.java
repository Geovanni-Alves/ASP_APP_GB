package com.asp.api.invites;

import com.asp.api.audit.AuditService;
import com.asp.api.auth.Roles;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InviteController {

    public record AcceptRequest(String email, String code, String password, String app) {}

    private final InviteService invites;
    private final AuditService audit;

    public InviteController(InviteService invites, AuditService audit) {
        this.invites = invites;
        this.audit = audit;
    }

    // POST /contacts/{contactId}/invite  (staff and admins)
    // -> { status: "sent", validDays: 7 }  or  { status: "already_registered" }
    @PostMapping("/contacts/{contactId}/invite")
    public Map<String, Object> invite(@PathVariable UUID contactId, Authentication auth) {
        Roles.requireManager(auth);
        return invites.invite(contactId, UUID.fromString(auth.getName()));
    }

    // POST /auth/accept-invite  (public: the parent has no account yet)
    // Body: { email, code, password, app? } -> { token, user }, the same shape as the login
    @PostMapping("/auth/accept-invite")
    public Map<String, Object> accept(@RequestBody AcceptRequest request) {
        Map<String, Object> result = invites.accept(request.email(), request.code(), request.password(), request.app());

        // The person is signed in now: the first access leaves a trace (this is not the login route)
        if (result.get("user") instanceof Map<?, ?> user) {
            try {
                audit.loginOk(UUID.fromString(String.valueOf(user.get("id"))), String.valueOf(user.get("name")),
                    String.valueOf(user.get("userType")), request.app() == null ? "" : request.app(),
                    "invite.accepted");
            } catch (IllegalArgumentException e) {
                // not an id we can record: the invite itself worked
            }
        }
        return result;
    }
}
