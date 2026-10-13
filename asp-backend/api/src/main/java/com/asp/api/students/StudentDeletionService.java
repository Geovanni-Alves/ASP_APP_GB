package com.asp.api.students;

import com.asp.api.files.FileStorage;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Permanent deletion of a student, with everything that belongs to that student.
 * Only students whose status is "Inactive" (archived) can be deleted.
 *
 * The database refuses to delete a student that other tables still point to, so the dependent
 * rows are deleted first, in ONE transaction ("all or nothing"). The photos and videos on disk are
 * removed only AFTER the transaction has committed: a file can never disappear while the data is
 * still in the database.
 *
 * Deleted: schedule, addresses, feed posts, pictures, route leftovers, and (through the database's own
 * cascade rules) attendance, messages, details, route stops and the links to the contacts.
 * Contacts that belonged only to this student are deleted too. User accounts are never deleted here.
 */
@Service
public class StudentDeletionService {

    private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9._-]{1,200}$");

    private record FileRef(String bucket, String name) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final FileStorage storage;

    public StudentDeletionService(JdbcTemplate jdbc, TransactionTemplate transaction, FileStorage storage) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.storage = storage;
    }

    public Map<String, Object> delete(UUID studentId) {
        List<FileRef> files = transaction.execute(status -> deleteRows(studentId));

        // The data is gone for good; now remove the files (best effort)
        int removed = 0;
        if (files != null) {
            for (FileRef file : files) {
                try {
                    if (storage.delete(file.bucket(), file.name())) {
                        removed++;
                    }
                } catch (IOException | RuntimeException e) {
                    // a file that cannot be removed does not undo the deletion
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deleted", 1);
        result.put("filesRemoved", removed);
        return result;
    }

    // Runs inside the transaction. Returns the files that must be removed after the commit.
    private List<FileRef> deleteRows(UUID studentId) {
        List<String> statuses = jdbc.queryForList(
            "select coalesce(status, 'Active') from students where id = ?", String.class, studentId);
        if (statuses.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found");
        }
        // Safety net: a student is archived (Inactive) first. Only an archived student can be erased,
        // so an active child is never deleted by accident.
        if (!"Inactive".equalsIgnoreCase(statuses.get(0))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only inactive students can be deleted. Set the status to Inactive first.");
        }

        // 1) Remember what has to be cleaned up (before the rows disappear)
        List<FileRef> files = new ArrayList<>();
        addFiles(files, "profilePhotos", jdbc.queryForList(
            "select photo from students where id = ? and photo is not null", String.class, studentId));
        addFiles(files, "schoolexitphotos", jdbc.queryForList(
            "select elem->>'path' from students s, "
                + "jsonb_array_elements(case when jsonb_typeof(s.\"schoolExitPhotos\") = 'array' "
                + "then s.\"schoolExitPhotos\" else '[]'::jsonb end) elem "
                + "where s.id = ? and elem->>'path' is not null",
            String.class, studentId));
        addFiles(files, "photos", jdbc.queryForList(
            "select picture from pictures where \"studentId\" = ? and picture is not null", String.class, studentId));
        addFiles(files, "feedPhotos", jdbc.queryForList(
            "select \"mediaName\" from \"kidFeeds\" where \"studentId\" = ? and type = 'PHOTO' "
                + "and \"mediaName\" is not null", String.class, studentId));
        addFiles(files, "feedVideos", jdbc.queryForList(
            "select \"mediaName\" from \"kidFeeds\" where \"studentId\" = ? and type = 'VIDEO' "
                + "and \"mediaName\" is not null", String.class, studentId));

        List<UUID> contactIds = jdbc.queryForList(
            "select contact_id from student_family where student_id = ?", UUID.class, studentId);
        List<UUID> addressIds = jdbc.queryForList(
            "select id from students_address where \"studentId\" = ?", UUID.class, studentId);

        // 2) Planned routes keep ids in plain arrays (no foreign key): remove this student's ids
        jdbc.update("update routes set absents = array_remove(absents, ?)", studentId);
        for (UUID addressId : addressIds) {
            jdbc.update("update route_vans set address_order = array_remove(address_order, ?)", addressId);
        }

        // 3) Rows that block the deletion (no cascade rule in the database)
        jdbc.update("delete from \"kidFeeds\" where \"studentId\" = ?", studentId);
        jdbc.update("delete from pictures where \"studentId\" = ?", studentId);
        jdbc.update("delete from drop_off_address_order where \"studentId\" = ?", studentId);
        jdbc.update("delete from week_day_routes where \"studentId\" = ?", studentId);
        jdbc.update("delete from students_schedule where \"studentId\" = ?", studentId);
        jdbc.update("delete from students_address where \"studentId\" = ?", studentId);

        // 4) The student. The database cascades attendance, messages, details, route stops and family links.
        jdbc.update("delete from students where id = ?", studentId);

        // 5) Contacts that belonged only to this student
        for (UUID contactId : contactIds) {
            jdbc.update(
                "delete from contacts c where c.id = ? "
                    + "and not exists (select 1 from student_family sf where sf.contact_id = c.id)",
                contactId);
        }
        return files;
    }

    private static void addFiles(List<FileRef> files, String bucket, List<String> names) {
        for (String name : names) {
            if (name != null && SAFE_NAME.matcher(name).matches()) {
                files.add(new FileRef(bucket, name));
            }
        }
    }
}
