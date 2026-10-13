package com.asp.api.auth;

import org.springframework.http.HttpStatus;

/**
 * A sign-in problem the apps need to tell apart. The answer carries a machine readable "code"
 * ("account_disabled", "app_not_allowed") next to the message, see AuthProblemHandler.
 */
public class AuthProblem extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AuthProblem(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
