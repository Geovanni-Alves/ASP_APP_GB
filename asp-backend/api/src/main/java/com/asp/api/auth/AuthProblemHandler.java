package com.asp.api.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthProblemHandler {

    @ExceptionHandler(AuthProblem.class)
    public ResponseEntity<Map<String, Object>> handle(AuthProblem problem) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", problem.getMessage());
        body.put("code", problem.getCode());
        return ResponseEntity.status(problem.getStatus()).body(body);
    }
}
