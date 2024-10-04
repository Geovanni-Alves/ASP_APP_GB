alter type "public"."feed_type" rename to "feed_type__old_version_to_be_dropped";

create type "public"."feed_type" as enum ('ATTENDANCE', 'PHOTO', 'PROMOTION', 'ACTIVITY', 'VIDEO', 'INCIDENT');

create table "public"."contacts" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid,
    "name" text not null,
    "email" text not null,
    "phone" text,
    "relationship" text,
    "is_primary_contact" boolean default false,
    "invited" boolean default false,
    "user_id" uuid,
    "signed" boolean
);


alter table "public"."contacts" enable row level security;

alter table "public"."kidFeeds" alter column type type "public"."feed_type" using type::text::"public"."feed_type";

drop type "public"."feed_type__old_version_to_be_dropped";

alter table "public"."kidFeeds" add column "notes" text;

alter table "public"."students" add column "schoolExitPhotos" jsonb;

alter table "public"."students" add column "schoolGrade" text;

alter table "public"."students" add column "schoolGradeDivision" text;

alter table "public"."students" add column "schoolTeacherName" text;

alter table "public"."users" add column "firstLogin" boolean;

CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id);

alter table "public"."contacts" add constraint "contacts_pkey" PRIMARY KEY using index "contacts_pkey";

alter table "public"."contacts" add constraint "contacts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."contacts" validate constraint "contacts_student_id_fkey";

alter table "public"."contacts" add constraint "public_contacts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."contacts" validate constraint "public_contacts_user_id_fkey";

grant delete on table "public"."contacts" to "anon";

grant insert on table "public"."contacts" to "anon";

grant references on table "public"."contacts" to "anon";

grant select on table "public"."contacts" to "anon";

grant trigger on table "public"."contacts" to "anon";

grant truncate on table "public"."contacts" to "anon";

grant update on table "public"."contacts" to "anon";

grant delete on table "public"."contacts" to "authenticated";

grant insert on table "public"."contacts" to "authenticated";

grant references on table "public"."contacts" to "authenticated";

grant select on table "public"."contacts" to "authenticated";

grant trigger on table "public"."contacts" to "authenticated";

grant truncate on table "public"."contacts" to "authenticated";

grant update on table "public"."contacts" to "authenticated";

grant delete on table "public"."contacts" to "service_role";

grant insert on table "public"."contacts" to "service_role";

grant references on table "public"."contacts" to "service_role";

grant select on table "public"."contacts" to "service_role";

grant trigger on table "public"."contacts" to "service_role";

grant truncate on table "public"."contacts" to "service_role";

grant update on table "public"."contacts" to "service_role";

create policy "allow all authenticated"
on "public"."contacts"
as permissive
for all
to authenticated
using (true);



