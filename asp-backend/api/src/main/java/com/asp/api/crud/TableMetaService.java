package com.asp.api.crud;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Reads the column names and types of a table from the database (once, then cached).
 * Used to validate request columns and to cast values to the right SQL type.
 */
@Service
public class TableMetaService {

    /** castType is the SQL type used in CAST(? AS castType), e.g. "uuid", "integer", "uuid[]". */
    public record Column(String name, String castType) {}

    private final JdbcTemplate jdbc;
    private final Map<String, Map<String, Column>> cache = new ConcurrentHashMap<>();

    public TableMetaService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Column> columns(String table) {
        return cache.computeIfAbsent(table, this::load);
    }

    private Map<String, Column> load(String table) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select column_name, data_type, udt_name from information_schema.columns "
                + "where table_schema = 'public' and table_name = ? order by ordinal_position",
            table);

        Map<String, Column> columns = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String name = (String) row.get("column_name");
            String dataType = (String) row.get("data_type");
            String udtName = (String) row.get("udt_name");

            String castType;
            if ("ARRAY".equals(dataType)) {
                castType = udtName.substring(1) + "[]"; // udt_name of arrays starts with "_" (e.g. _uuid)
            } else if ("USER-DEFINED".equals(dataType)) {
                castType = "\"" + udtName + "\""; // enums such as feed_type
            } else {
                castType = dataType;
            }
            columns.put(name, new Column(name, castType));
        }
        return columns;
    }
}
