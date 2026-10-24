package com.asp.api.maintenance;

import com.asp.api.auth.Roles;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** For the programmer: runs a job now, without waiting for the night. */
@RestController
@RequestMapping("/maintenance")
public class MaintenanceController {

    private final MediaRetentionJob retention;

    public MaintenanceController(MediaRetentionJob retention) {
        this.retention = retention;
    }

    /** POST /maintenance/media-retention -> what was deleted (only the super admin) */
    @PostMapping("/media-retention")
    public Map<String, Object> mediaRetention(Authentication auth) {
        if (!Roles.isSuperAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only for the programmer");
        }
        return retention.expire();
    }
}
