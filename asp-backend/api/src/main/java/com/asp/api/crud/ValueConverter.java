package com.asp.api.crud;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Converts values coming from the JSON request into Strings that are bound to
 * CAST(? AS type) in SQL. PostgreSQL then converts them to the real column type.
 */
@Component
public class ValueConverter {

    private final ObjectMapper mapper;

    public ValueConverter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String toParam(Object value, TableMetaService.Column column) {
        if (value == null) {
            return null;
        }
        String type = column.castType();

        if (type.equals("jsonb") || type.equals("json")) {
            try {
                return mapper.writeValueAsString(value);
            } catch (JsonProcessingException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid JSON value for column " + column.name());
            }
        }
        if (type.endsWith("[]")) {
            if (value instanceof List<?> list) {
                return arrayLiteral(list);
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Column " + column.name() + " expects an array");
        }
        if (value instanceof Map || value instanceof List) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Column " + column.name() + " does not accept objects or arrays");
        }
        return String.valueOf(value);
    }

    /** Builds a PostgreSQL array literal, e.g. {"a","b"}. */
    public String arrayLiteral(List<?> items) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            Object item = items.get(i);
            if (item == null) {
                sb.append("NULL");
            } else {
                String text = String.valueOf(item).replace("\\", "\\\\").replace("\"", "\\\"");
                sb.append('"').append(text).append('"');
            }
        }
        return sb.append('}').toString();
    }
}
