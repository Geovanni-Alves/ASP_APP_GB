package com.asp.api.crud;

import java.sql.SQLException;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Turns database errors from the generic CRUD endpoints into readable JSON errors.
 *   SQLSTATE 23xxx (foreign key, unique, not null, check) -> 409 Conflict
 *   anything else (bad uuid, bad number, ...)             -> 400 Bad Request
 * Only applies to CrudController, so other endpoints never expose SQL messages.
 */
@RestControllerAdvice(assignableTypes = CrudController.class)
public class CrudExceptionHandler {

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> handleDatabaseError(DataAccessException ex) {
        Throwable root = ex.getMostSpecificCause();

        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (root instanceof SQLException sql && sql.getSQLState() != null && sql.getSQLState().startsWith("23")) {
            status = HttpStatus.CONFLICT;
        }
        return ResponseEntity.status(status).body(Map.of("error", String.valueOf(root.getMessage())));
    }
}
