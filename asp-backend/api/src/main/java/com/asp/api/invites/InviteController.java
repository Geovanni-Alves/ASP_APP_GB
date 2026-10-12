package com.asp.api.invites;

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

    public record AcceptRequest(String email, String code, String password) {}

    private final InviteService invites;

    public InviteController(InviteService invites) {
        this.invites = invites;
    }

    // POST /contacts/{contactId}/invite  (staff and admins)
    // -> { status: "sent", validDays: 7 }  or  { status: "already_registered" }
    @PostMapping("/contacts/{contactId}/invite")
    public Map<String, Object> invite(@PathVariable UUID contactId, Authentication auth) {
        Roles.requireStaff(auth);
        return invites.invite(contactId, UUID.fromString(auth.getName()));
    }

    // POST /auth/accept-invite  (public: the parent has no account yet)
    // Body: { email, code, password } -> { token, user }, the same shape as the login
    @PostMapping("/auth/accept-invite")
    public Map<String, Object> accept(@RequestBody AcceptRequest request) {
        return invites.accept(request.email(), request.code(), request.password());
    }
}
