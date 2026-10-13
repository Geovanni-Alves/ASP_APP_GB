package com.asp.api.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Every error the API raises on purpose (400, 403, 404, 409...) now answers with a body like
 * { "error": "Please enter a valid email address" }, so the screens can show the real reason.
 * Unexpected failures (500) are NOT handled here, so internal details never reach the client.
 */
@RestControllerAdvice
public class ApiErrorHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException e) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", e.getReason() != null ? e.getReason() : e.getStatusCode().toString());
        return ResponseEntity.status(e.getStatusCode()).body(body);
    }
}
