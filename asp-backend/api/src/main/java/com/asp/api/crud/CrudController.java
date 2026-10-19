package com.asp.api.crud;

import com.asp.api.auth.Roles;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.asp.api.audit.AuditService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * One generic controller that serves every table listed in CrudTables.
 *
 *   GET    /{table}?col=value&order=col.desc&limit=100&offset=0&select=id,name
 *   GET    /{table}/{id}
 *   POST   /{table}            body: one JSON object, or an array of objects
 *   PATCH  /{table}/{id}       body: the columns to change
 *   DELETE /{table}/{id}
 *   DELETE /{table}?col=value  (required for tables with a composite key; needs at least one filter)
 *
 * Filter values: col=value (equals), col=null (is null), col=in:a,b,c (in a list).
 * Responses are built by PostgreSQL itself (row_to_json), so dates, uuids, arrays and jsonb
 * come out in the same format the old Supabase REST API used.
 *
 * For now every endpoint requires a staff/admin user (the dashboard). Rules for
 * parents and drivers will be added when the mobile apps are migrated.
 */
@RestController
public class CrudController {

    private static final Set<String> RESERVED = Set.of("order", "limit", "offset", "select");

    // Rows of these tables are never deleted through the generic endpoints (they are archived instead).
    // Deleting a van would even erase its routes (route_vans has "on delete cascade").
    private static final Set<String> NEVER_DELETED = Set.of("students", "vans");

    // Fields that have their own endpoint with rules (open routes, vans...): the generic PATCH refuses them
    private static final Map<String, String> RULE_FIELDS = Map.of("students", "status", "vans", "active");
    private static final int DEFAULT_LIMIT = 1000;
    private static final int MAX_LIMIT = 5000;

    private record Where(String sql, List<Object> args) {}

    private final JdbcTemplate jdbc;
    private final TableMetaService meta;
    private final ValueConverter converter;

    private final AuditService audit;

    public CrudController(JdbcTemplate jdbc, TableMetaService meta, ValueConverter converter, AuditService audit) {
        this.jdbc = jdbc;
        this.meta = meta;
        this.converter = converter;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- READ

    @GetMapping("/{resource}")
    public ResponseEntity<String> list(@PathVariable String resource,
                                       @RequestParam Map<String, String> params,
                                       Authentication auth) {
        Roles.requireManager(auth);
        Map<String, TableMetaService.Column> cols = columnsOf(resource);
        Where where = buildWhere(cols, params);

        String sql = "select coalesce(json_agg(row_to_json(t)), '[]'::json)::text from (select "
            + selectList(cols, params.get("select"))
            + " from " + quote(resource)
            + where.sql()
            + orderBy(cols, params.get("order"))
            + " limit " + limit(params.get("limit"))
            + " offset " + offset(params.get("offset"))
            + ") t";

        return json(HttpStatus.OK, jdbc.queryForObject(sql, String.class, where.args().toArray()));
    }

    @GetMapping("/{resource}/{id}")
    public ResponseEntity<String> getOne(@PathVariable String resource,
                                         @PathVariable String id,
                                         Authentication auth) {
        Roles.requireManager(auth);
        Map<String, TableMetaService.Column> cols = columnsOf(resource);
        String pk = requirePrimaryKey(resource);

        List<String> rows = jdbc.queryForList(
            "select row_to_json(t)::text from " + quote(resource) + " t where "
                + quote(pk) + " = CAST(? AS " + cols.get(pk).castType() + ")",
            String.class, id);

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Row not found");
        }
        return json(HttpStatus.OK, rows.get(0));
    }

    // -------------------------------------------------------------- CREATE

    @PostMapping("/{resource}")
    @Transactional
    public ResponseEntity<String> create(@PathVariable String resource,
                                         @RequestBody Object body,
                                         Authentication auth) {
        Roles.requireManager(auth);
        Map<String, TableMetaService.Column> cols = columnsOf(resource);

        if (body instanceof List<?> items) {
            List<String> created = new ArrayList<>();
            for (Object item : items) {
                created.add(insertOne(resource, cols, asRow(item)));
            }
            for (String createdRow : created) {
                auditCreated(auth, resource, createdRow);
            }
            return json(HttpStatus.CREATED, "[" + String.join(",", created) + "]");
        }
        String newRow = insertOne(resource, cols, asRow(body));
        auditCreated(auth, resource, newRow);
        return json(HttpStatus.CREATED, newRow);
    }

    // -------------------------------------------------------------- UPDATE

    @PatchMapping("/{resource}/{id}")
    @Transactional
    public ResponseEntity<String> update(@PathVariable String resource,
                                         @PathVariable String id,
                                         @RequestBody Map<String, Object> body,
                                         Authentication auth) {
        Roles.requireManager(auth);
        String ruleField = RULE_FIELDS.get(resource);
        if (ruleField != null && body.containsKey(ruleField)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Use PUT /" + resource + "/{id}/" + ruleField + " to change this field");
        }
        Map<String, TableMetaService.Column> cols = columnsOf(resource);
        String pk = requirePrimaryKey(resource);

        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            if (entry.getKey().equals(pk)) {
                continue; // the primary key is never changed
            }
            TableMetaService.Column col = cols.get(entry.getKey());
            if (col == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown column: " + entry.getKey());
            }
            sets.add(quote(col.name()) + " = CAST(? AS " + col.castType() + ")");
            args.add(converter.toParam(entry.getValue(), col));
        }
        if (sets.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nothing to update");
        }
        args.add(id);

        Map<String, Object> before = rowOf(resource, pk, cols, id); // for the activity log

        String sql = "with upd as (update " + quote(resource) + " set " + String.join(", ", sets)
            + " where " + quote(pk) + " = CAST(? AS " + cols.get(pk).castType() + ") returning *) "
            + "select row_to_json(upd)::text from upd";

        List<String> rows = jdbc.queryForList(sql, String.class, args.toArray());
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Row not found");
        }

        // The activity log: only what really changed, with the old and the new value
        Map<String, Object> after = audit.parse(rows.get(0));
        Map<String, Object> changes = AuditService.diff(before, after);
        if (changes.isEmpty()) {
            audit.markLogged();
        } else {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("changes", changes);
            audit.log(auth, resource + ".update", resource, id, AuditService.labelOf(after), details);
        }
        return json(HttpStatus.OK, rows.get(0));
    }

    // -------------------------------------------------------------- DELETE

    @DeleteMapping("/{resource}/{id}")
    @Transactional
    public ResponseEntity<String> deleteById(@PathVariable String resource,
                                             @PathVariable String id,
                                             Authentication auth) {
        Roles.requireManager(auth);
        rejectProtectedDelete(resource);
        Map<String, TableMetaService.Column> cols = columnsOf(resource);
        String pk = requirePrimaryKey(resource);

        Map<String, Object> before = rowOf(resource, pk, cols, id); // for the activity log

        Long deleted = jdbc.queryForObject(
            "with del as (delete from " + quote(resource) + " where " + quote(pk)
                + " = CAST(? AS " + cols.get(pk).castType() + ") returning 1) select count(*) from del",
            Long.class, id);

        if (deleted != null && deleted > 0) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("deleted", AuditService.clean(before));
            audit.log(auth, resource + ".delete", resource, id, AuditService.labelOf(before), details);
        }
        return json(HttpStatus.OK, "{\"deleted\":" + deleted + "}");
    }

    @DeleteMapping("/{resource}")
    @Transactional
    public ResponseEntity<String> deleteWhere(@PathVariable String resource,
                                              @RequestParam Map<String, String> params,
                                              Authentication auth) {
        Roles.requireManager(auth);
        rejectProtectedDelete(resource);
        Map<String, TableMetaService.Column> cols = columnsOf(resource);
        Where where = buildWhere(cols, params);

        if (where.sql().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "At least one filter is required (refusing to delete the whole table)");
        }
        // The first rows that are about to go, for the activity log
        String doomed = jdbc.queryForObject(
            "select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text from (select * from "
                + quote(resource) + where.sql() + " limit 20) t",
            String.class, where.args().toArray());

        Long deleted = jdbc.queryForObject(
            "with del as (delete from " + quote(resource) + where.sql()
                + " returning 1) select count(*) from del",
            Long.class, where.args().toArray());

        if (deleted != null && deleted > 0) {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (Map<String, Object> row : audit.parseList(doomed)) {
                rows.add(AuditService.clean(row));
            }
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("count", deleted);
            details.put("rows", rows);
            audit.log(auth, resource + ".delete", resource, null, deleted + " row(s)", details);
        }
        return json(HttpStatus.OK, "{\"deleted\":" + deleted + "}");
    }

    // ------------------------------------------------------------- helpers

    private String insertOne(String table, Map<String, TableMetaService.Column> cols, Map<String, Object> row) {
        if (row.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty body");
        }
        List<String> names = new ArrayList<>();
        List<String> placeholders = new ArrayList<>();
        List<Object> args = new ArrayList<>();

        for (Map.Entry<String, Object> entry : row.entrySet()) {
            TableMetaService.Column col = cols.get(entry.getKey());
            if (col == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown column: " + entry.getKey());
            }
            names.add(quote(col.name()));
            placeholders.add("CAST(? AS " + col.castType() + ")");
            args.add(converter.toParam(entry.getValue(), col));
        }

        String sql = "with ins as (insert into " + quote(table) + " (" + String.join(", ", names)
            + ") values (" + String.join(", ", placeholders) + ") returning *) "
            + "select row_to_json(ins)::text from ins";
        return jdbc.queryForObject(sql, String.class, args.toArray());
    }

    @SuppressWarnings("unchecked")
    // The row as it is now (for the activity log); empty when it does not exist
    private Map<String, Object> rowOf(String resource, String pk, Map<String, TableMetaService.Column> cols, String id) {
        List<String> rows = jdbc.queryForList(
            "select row_to_json(t)::text from " + quote(resource) + " t where " + quote(pk)
                + " = CAST(? AS " + cols.get(pk).castType() + ")",
            String.class, id);
        return rows.isEmpty() ? new LinkedHashMap<>() : audit.parse(rows.get(0));
    }

    // A new row in the activity log: the values it was created with
    private void auditCreated(Authentication auth, String resource, String rowJson) {
        Map<String, Object> row = audit.parse(rowJson);
        String pk = null;
        try {
            pk = requirePrimaryKey(resource);
        } catch (ResponseStatusException e) {
            // a table with a composite key (student_family): the values say everything
        }
        Object id = pk == null ? null : row.get(pk);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("values", AuditService.clean(row));
        audit.log(auth, resource + ".create", resource, id, AuditService.labelOf(row), details);
    }

    private Map<String, Object> asRow(Object item) {
        if (item instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Body must be a JSON object or an array of objects");
    }

    private Map<String, TableMetaService.Column> columnsOf(String resource) {
        if (!CrudTables.exists(resource)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown resource: " + resource);
        }
        Map<String, TableMetaService.Column> cols = meta.columns(resource);
        if (cols.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found in the database: " + resource);
        }
        return cols;
    }

    private void rejectProtectedDelete(String resource) {
        if (NEVER_DELETED.contains(resource)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Students and vans are never deleted from the app. Deactivate them instead.");
        }
    }

    private String requirePrimaryKey(String resource) {
        String pk = CrudTables.PRIMARY_KEYS.get(resource);
        if (pk == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "This table has a composite key: use filters (query parameters) instead of an id");
        }
        return pk;
    }

    private Where buildWhere(Map<String, TableMetaService.Column> cols, Map<String, String> params) {
        List<String> conditions = new ArrayList<>();
        List<Object> args = new ArrayList<>();

        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (RESERVED.contains(entry.getKey())) {
                continue;
            }
            TableMetaService.Column col = cols.get(entry.getKey());
            if (col == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown column: " + entry.getKey());
            }
            String value = entry.getValue();

            if ("null".equals(value)) {
                conditions.add(quote(col.name()) + " is null");
            } else if (value.startsWith("in:")) {
                conditions.add(quote(col.name()) + " = any(CAST(? AS " + col.castType() + "[]))");
                args.add(converter.arrayLiteral(Arrays.asList(value.substring(3).split(","))));
            } else {
                conditions.add(quote(col.name()) + " = CAST(? AS " + col.castType() + ")");
                args.add(value);
            }
        }
        String sql = conditions.isEmpty() ? "" : " where " + String.join(" and ", conditions);
        return new Where(sql, args);
    }

    private String selectList(Map<String, TableMetaService.Column> cols, String raw) {
        if (raw == null || raw.isBlank() || raw.trim().equals("*")) {
            return "*";
        }
        List<String> names = new ArrayList<>();
        for (String name : raw.split(",")) {
            TableMetaService.Column col = cols.get(name.trim());
            if (col == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown column: " + name.trim());
            }
            names.add(quote(col.name()));
        }
        return String.join(", ", names);
    }

    // order=name  |  order=name.desc  |  order=date.desc,name
    private String orderBy(Map<String, TableMetaService.Column> cols, String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        List<String> parts = new ArrayList<>();
        for (String token : raw.split(",")) {
            String[] pieces = token.trim().split("\\.");
            TableMetaService.Column col = cols.get(pieces[0]);
            if (col == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown column: " + pieces[0]);
            }
            String direction = (pieces.length > 1 && pieces[1].equalsIgnoreCase("desc")) ? "desc" : "asc";
            parts.add(quote(col.name()) + " " + direction);
        }
        return " order by " + String.join(", ", parts);
    }

    private int limit(String raw) {
        return Math.min(Math.max(parseInt(raw, DEFAULT_LIMIT, "limit"), 1), MAX_LIMIT);
    }

    private int offset(String raw) {
        return Math.max(parseInt(raw, 0, "offset"), 0);
    }

    private int parseInt(String raw, int defaultValue, String name) {
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " must be a number");
        }
    }

    // Names are always taken from the validated column list or the table whitelist, never from raw input.
    private static String quote(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private static ResponseEntity<String> json(HttpStatus status, String body) {
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
