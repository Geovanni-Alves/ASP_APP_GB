package com.asp.api.students;

import com.asp.api.auth.Roles;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Student endpoints that need data from several tables or several writes at once.
 * Plain create/update/delete of a student is still handled by the generic CRUD controller
 * (POST /students, PATCH /students/{id}, ...); this controller adds:
 *
 *   GET    /students/full                                   students with school, contacts, schedule, address
 *   POST   /students/{studentId}/addresses                  add an address
 *   PUT    /students/{studentId}/addresses/{addressId}      edit an address
 *   PUT    /students/{studentId}/addresses/{addressId}/default   make it the default address
 *   DELETE /students/{studentId}/addresses/{addressId}      delete an address
 *   POST   /students/{studentId}/contacts                   add (or link an existing) parent/guardian
 *   PUT    /students/{studentId}/contacts/{contactId}       edit a contact
 *   DELETE /students/{studentId}/contacts/{contactId}       remove a contact from this student
 *
 * Every write here runs in ONE transaction ("all or nothing"), because each one touches several
 * tables that must always agree (for example students_address and students, or users, contacts
 * and student_family).
 */
@RestController
@RequestMapping("/students")
public class StudentsController {

    // One query builds every student with its related data nested inside, in the same shape
    // the dashboard used to get from Supabase:
    //   schools            -> the student's school (object or null)
    //   drop_off_route     -> legacy drop-off route (object or null)
    //   student_family     -> list of { contact: {...} } (parents / guardians)
    //   students_schedule  -> list of weekly schedules (the dashboard uses the first one)
    //   dropOffAddress     -> the address referenced by students."currentDropOffAddress"
    //                         (the old code fetched it with one extra request per student)
    private static final String FULL_SQL = """
        select coalesce(json_agg(row_to_json(x) order by x.name), '[]'::json)::text
        from (
          select s.*,
            (select to_jsonb(sc) from schools sc where sc.id = s."schoolId") as schools,
            (select to_jsonb(r) from drop_off_route r where r.id = s."dropOffRouteId") as drop_off_route,
            coalesce((
              select jsonb_agg(jsonb_build_object('contact', to_jsonb(c)))
              from student_family sf
              join contacts c on c.id = sf.contact_id
              where sf.student_id = s.id
            ), '[]'::jsonb) as student_family,
            coalesce((
              select jsonb_agg(to_jsonb(ss))
              from students_schedule ss
              where ss."studentId" = s.id
            ), '[]'::jsonb) as students_schedule,
            (select to_jsonb(a) from students_address a where a.id = s."currentDropOffAddress") as "dropOffAddress"
          from students s
        ) x
        """;

    // Address fields a client may send, with their kind. The server controls the rest:
    //   id, studentId  -> come from the URL / are generated
    //   isDefault      -> changed only through "makeDefault" or the /default endpoint
    private static final Map<String, String> ADDRESS_FIELDS = Map.ofEntries(
        Map.entry("houseName", "text"),
        Map.entry("addressLine1", "text"),
        Map.entry("addressLine2", "text"),
        Map.entry("addressNotes", "text"),
        Map.entry("unitNumber", "text"),
        Map.entry("city", "text"),
        Map.entry("province", "text"),
        Map.entry("zipCode", "text"),
        Map.entry("country", "text"),
        Map.entry("lat", "number"),
        Map.entry("lng", "number"));

    // Keys that may arrive in the body (the edit form sends the whole row back) and are ignored.
    private static final Set<String> IGNORED_KEYS = Set.of("id", "studentId", "isDefault", "makeDefault");

    // Contact fields a client may send. Ignored on purpose (the server controls them):
    //   id, user_id, student_id -> generated or resolved by the server
    //   invited, signed         -> set by the invite flow, never by the dashboard form
    private static final Map<String, String> CONTACT_FIELDS = Map.of(
        "firstName", "text",
        "lastName", "text",
        "email", "text",
        "phone", "text",
        "type", "text",
        "code", "text",
        "canPickup", "boolean",
        "is_primary_contact", "boolean");

    private static final Set<String> CONTACT_IGNORED_KEYS =
        Set.of("id", "user_id", "student_id", "invited", "signed");

    private final JdbcTemplate jdbc;

    public StudentsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // GET /students/full -> all students with school, contacts, schedule and drop-off address
    @GetMapping("/full")
    public ResponseEntity<String> full(Authentication auth) {
        Roles.requireStaff(auth);
        String json = jdbc.queryForObject(FULL_SQL, String.class);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
    }

    // POST /students/{studentId}/addresses
    // Body: address fields plus optional "makeDefault": true.
    // The first address of a student is always made the default.
    @PostMapping("/{studentId}/addresses")
    @Transactional
    public Map<String, Object> addAddress(@PathVariable UUID studentId,
                                          @RequestBody Map<String, Object> body,
                                          Authentication auth) {
        Roles.requireStaff(auth);
        requireStudent(studentId);

        Integer existing = jdbc.queryForObject(
            "select count(*) from students_address where \"studentId\" = ?", Integer.class, studentId);
        boolean makeDefault = (existing != null && existing == 0) || Boolean.TRUE.equals(body.get("makeDefault"));

        Map<String, Object> fields = addressFields(body);
        List<String> columns = new ArrayList<>(List.of("\"studentId\"", "\"isDefault\""));
        List<String> marks = new ArrayList<>(List.of("?", "?"));
        List<Object> args = new ArrayList<>(List.of(studentId, false));
        for (Map.Entry<String, Object> field : fields.entrySet()) {
            columns.add("\"" + field.getKey() + "\""); // safe: the key was found in the whitelist
            marks.add("?");
            args.add(field.getValue());
        }

        UUID id = jdbc.queryForObject(
            "insert into students_address (" + String.join(", ", columns) + ") values ("
                + String.join(", ", marks) + ") returning id",
            UUID.class, args.toArray());

        if (makeDefault) {
            setDefault(studentId, id);
        }
        return fetchAddress(id);
    }

    // PUT /students/{studentId}/addresses/{addressId}
    // "makeDefault": true promotes this address; it never demotes the current default.
    @PutMapping("/{studentId}/addresses/{addressId}")
    @Transactional
    public Map<String, Object> updateAddress(@PathVariable UUID studentId,
                                             @PathVariable UUID addressId,
                                             @RequestBody Map<String, Object> body,
                                             Authentication auth) {
        Roles.requireStaff(auth);
        requireAddress(studentId, addressId);

        Map<String, Object> fields = addressFields(body);
        if (!fields.isEmpty()) {
            List<String> sets = new ArrayList<>();
            List<Object> args = new ArrayList<>();
            for (Map.Entry<String, Object> field : fields.entrySet()) {
                sets.add("\"" + field.getKey() + "\" = ?");
                args.add(field.getValue());
            }
            args.add(addressId);
            jdbc.update("update students_address set " + String.join(", ", sets) + " where id = ?", args.toArray());
        }
        if (Boolean.TRUE.equals(body.get("makeDefault"))) {
            setDefault(studentId, addressId);
        }
        return fetchAddress(addressId);
    }

    // PUT /students/{studentId}/addresses/{addressId}/default
    @PutMapping("/{studentId}/addresses/{addressId}/default")
    @Transactional
    public Map<String, Object> makeDefaultAddress(@PathVariable UUID studentId,
                                                  @PathVariable UUID addressId,
                                                  Authentication auth) {
        Roles.requireStaff(auth);
        requireAddress(studentId, addressId);
        setDefault(studentId, addressId);
        return fetchAddress(addressId);
    }

    // DELETE /students/{studentId}/addresses/{addressId}
    // If the deleted address was the default, another address (if any) becomes the default.
    @DeleteMapping("/{studentId}/addresses/{addressId}")
    @Transactional
    public Map<String, Integer> deleteAddress(@PathVariable UUID studentId,
                                              @PathVariable UUID addressId,
                                              Authentication auth) {
        Roles.requireStaff(auth);
        requireAddress(studentId, addressId);

        Boolean wasDefault = jdbc.queryForObject(
            "select coalesce(\"isDefault\", false) from students_address where id = ?", Boolean.class, addressId);

        jdbc.update("delete from students_address where id = ?", addressId);

        // The student must never point to an address that no longer exists
        jdbc.update("update students set \"currentDropOffAddress\" = null where id = ? and \"currentDropOffAddress\" = ?",
            studentId, addressId);

        if (Boolean.TRUE.equals(wasDefault)) {
            List<UUID> remaining = jdbc.queryForList(
                "select id from students_address where \"studentId\" = ? order by id limit 1", UUID.class, studentId);
            if (!remaining.isEmpty()) {
                setDefault(studentId, remaining.get(0));
            }
        }
        return Map.of("deleted", 1);
    }

    // POST /students/{studentId}/contacts
    // - If a contact with the same email already exists ("Use Existing Contact"), it is only linked.
    // - Otherwise a new contact is created, together with a parent user account that has NO password
    //   yet (the parent sets one when the invite is accepted).
    @PostMapping("/{studentId}/contacts")
    @Transactional
    public Map<String, Object> addContact(@PathVariable UUID studentId,
                                          @RequestBody Map<String, Object> body,
                                          Authentication auth) {
        Roles.requireStaff(auth);
        requireStudent(studentId);

        Map<String, Object> fields = contactFields(body);
        if (stringOf(fields.get("firstName")).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "firstName is required");
        }
        fields.putIfAbsent("email", ""); // the column is NOT NULL
        String email = stringOf(fields.get("email"));

        if (!email.isEmpty()) {
            List<UUID> existing = jdbc.queryForList(
                "select id from contacts where lower(email) = lower(?) limit 1", UUID.class, email);
            if (!existing.isEmpty()) {
                linkContact(studentId, existing.get(0));
                return fetchContact(existing.get(0));
            }
        }

        List<String> columns = new ArrayList<>();
        List<String> marks = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        for (Map.Entry<String, Object> field : fields.entrySet()) {
            columns.add("\"" + field.getKey() + "\""); // safe: the key was found in the whitelist
            marks.add("?");
            args.add(field.getValue());
        }
        if (!email.isEmpty()) {
            columns.add("user_id");
            marks.add("?");
            args.add(findOrCreateParentUser(email, fields));
        }

        UUID contactId = jdbc.queryForObject(
            "insert into contacts (" + String.join(", ", columns) + ") values ("
                + String.join(", ", marks) + ") returning id",
            UUID.class, args.toArray());

        linkContact(studentId, contactId);
        return fetchContact(contactId);
    }

    // PUT /students/{studentId}/contacts/{contactId}
    @PutMapping("/{studentId}/contacts/{contactId}")
    @Transactional
    public Map<String, Object> updateContact(@PathVariable UUID studentId,
                                             @PathVariable UUID contactId,
                                             @RequestBody Map<String, Object> body,
                                             Authentication auth) {
        Roles.requireStaff(auth);
        requireContactLink(studentId, contactId);

        Map<String, Object> fields = contactFields(body);
        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        for (Map.Entry<String, Object> field : fields.entrySet()) {
            sets.add("\"" + field.getKey() + "\" = ?");
            args.add(field.getValue());
        }
        String email = stringOf(fields.get("email"));
        if (!email.isEmpty()) {
            sets.add("user_id = ?");
            args.add(findOrCreateParentUser(email, fields));
        }
        if (sets.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nothing to update");
        }
        args.add(contactId);
        jdbc.update("update contacts set " + String.join(", ", sets) + " where id = ?", args.toArray());
        return fetchContact(contactId);
    }

    // DELETE /students/{studentId}/contacts/{contactId}
    // Removes the contact from THIS student. The contact itself is deleted only when no other
    // student (for example a sibling) is still linked to it.
    @DeleteMapping("/{studentId}/contacts/{contactId}")
    @Transactional
    public Map<String, Integer> removeContact(@PathVariable UUID studentId,
                                              @PathVariable UUID contactId,
                                              Authentication auth) {
        Roles.requireStaff(auth);
        requireContactLink(studentId, contactId);

        jdbc.update("delete from student_family where student_id = ? and contact_id = ?", studentId, contactId);
        Integer stillLinked = jdbc.queryForObject(
            "select count(*) from student_family where contact_id = ?", Integer.class, contactId);

        int contactDeleted = 0;
        if (stillLinked == null || stillLinked == 0) {
            jdbc.update("delete from contacts where id = ?", contactId);
            contactDeleted = 1;
        }
        return Map.of("unlinked", 1, "contactDeleted", contactDeleted);
    }

    // ------------------------------------------------------------- helpers

    // One address is the default; every other address of the student is not.
    // The student row keeps a pointer to the default one.
    private void setDefault(UUID studentId, UUID addressId) {
        jdbc.update("update students_address set \"isDefault\" = (id = ?) where \"studentId\" = ?", addressId, studentId);
        jdbc.update("update students set \"currentDropOffAddress\" = ? where id = ?", addressId, studentId);
    }

    private Map<String, Object> addressFields(Map<String, Object> body) {
        Map<String, Object> fields = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (IGNORED_KEYS.contains(key)) {
                continue;
            }
            String kind = ADDRESS_FIELDS.get(key);
            if (kind == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown field: " + key);
            }
            if (kind.equals("text")) {
                if (value != null && !(value instanceof String)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be text");
                }
                fields.put(key, value);
            } else {
                if (value != null && !(value instanceof Number)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be a number");
                }
                fields.put(key, value == null ? null : ((Number) value).doubleValue());
            }
        }
        return fields;
    }

    private void requireStudent(UUID studentId) {
        Integer count = jdbc.queryForObject("select count(*) from students where id = ?", Integer.class, studentId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found");
        }
    }

    // The address must exist AND belong to this student (the URL must not mix them up).
    private void requireAddress(UUID studentId, UUID addressId) {
        Integer count = jdbc.queryForObject(
            "select count(*) from students_address where id = ? and \"studentId\" = ?",
            Integer.class, addressId, studentId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found for this student");
        }
    }

    private Map<String, Object> fetchAddress(UUID addressId) {
        return jdbc.queryForMap("select * from students_address where id = ?", addressId);
    }

    private Map<String, Object> contactFields(Map<String, Object> body) {
        Map<String, Object> fields = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (CONTACT_IGNORED_KEYS.contains(key)) {
                continue;
            }
            String kind = CONTACT_FIELDS.get(key);
            if (kind == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown field: " + key);
            }
            if (kind.equals("text")) {
                if (value != null && !(value instanceof String)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be text");
                }
                fields.put(key, stringOf(value)); // null becomes "" (some columns are NOT NULL)
            } else {
                if (value != null && !(value instanceof Boolean)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be true or false");
                }
                fields.put(key, value);
            }
        }
        return fields;
    }

    // Returns the id of the user with this email. If there is none, creates a parent account
    // WITHOUT a password. An existing account (for example a staff member) is never modified here.
    private UUID findOrCreateParentUser(String email, Map<String, Object> fields) {
        List<UUID> found = jdbc.queryForList(
            "select id from users where lower(email) = lower(?) limit 1", UUID.class, email);
        if (!found.isEmpty()) {
            return found.get(0);
        }
        String name = (stringOf(fields.get("firstName")) + " " + stringOf(fields.get("lastName"))).trim();
        String phone = stringOf(fields.get("phone"));
        return jdbc.queryForObject(
            "insert into users (name, email, \"phoneNumber\", \"userType\", \"firstLogin\", updated_at) "
                + "values (?, ?, ?, 'parent', true, now()) returning id",
            UUID.class, name, email, phone.isEmpty() ? null : phone);
    }

    private void linkContact(UUID studentId, UUID contactId) {
        jdbc.update("insert into student_family (student_id, contact_id) values (?, ?) on conflict do nothing",
            studentId, contactId);
    }

    private void requireContactLink(UUID studentId, UUID contactId) {
        Integer count = jdbc.queryForObject(
            "select count(*) from student_family where student_id = ? and contact_id = ?",
            Integer.class, studentId, contactId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact not found for this student");
        }
    }

    private Map<String, Object> fetchContact(UUID contactId) {
        return jdbc.queryForMap("select * from contacts where id = ?", contactId);
    }

    private static String stringOf(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
