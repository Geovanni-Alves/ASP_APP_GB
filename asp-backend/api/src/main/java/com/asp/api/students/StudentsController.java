package com.asp.api.students;

import com.asp.api.auth.Roles;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Student endpoints that need data from several tables at once.
 * Plain create/update/delete of a student is handled by the generic CRUD controller
 * (PATCH /students/{id}, POST /students, ...); this controller only adds the "joined" reads.
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
}
