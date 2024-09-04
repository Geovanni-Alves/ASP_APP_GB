drop policy "Allow authencated users to ALL" on "public"."address_list";

drop policy "Allow authencated users to ALL" on "public"."route";

drop policy "Allow authencated users to ALL" on "public"."van";

revoke delete on table "public"."address_list" from "anon";

revoke insert on table "public"."address_list" from "anon";

revoke references on table "public"."address_list" from "anon";

revoke select on table "public"."address_list" from "anon";

revoke trigger on table "public"."address_list" from "anon";

revoke truncate on table "public"."address_list" from "anon";

revoke update on table "public"."address_list" from "anon";

revoke delete on table "public"."address_list" from "authenticated";

revoke insert on table "public"."address_list" from "authenticated";

revoke references on table "public"."address_list" from "authenticated";

revoke select on table "public"."address_list" from "authenticated";

revoke trigger on table "public"."address_list" from "authenticated";

revoke truncate on table "public"."address_list" from "authenticated";

revoke update on table "public"."address_list" from "authenticated";

revoke delete on table "public"."address_list" from "service_role";

revoke insert on table "public"."address_list" from "service_role";

revoke references on table "public"."address_list" from "service_role";

revoke select on table "public"."address_list" from "service_role";

revoke trigger on table "public"."address_list" from "service_role";

revoke truncate on table "public"."address_list" from "service_role";

revoke update on table "public"."address_list" from "service_role";

revoke delete on table "public"."route" from "anon";

revoke insert on table "public"."route" from "anon";

revoke references on table "public"."route" from "anon";

revoke select on table "public"."route" from "anon";

revoke trigger on table "public"."route" from "anon";

revoke truncate on table "public"."route" from "anon";

revoke update on table "public"."route" from "anon";

revoke delete on table "public"."route" from "authenticated";

revoke insert on table "public"."route" from "authenticated";

revoke references on table "public"."route" from "authenticated";

revoke select on table "public"."route" from "authenticated";

revoke trigger on table "public"."route" from "authenticated";

revoke truncate on table "public"."route" from "authenticated";

revoke update on table "public"."route" from "authenticated";

revoke delete on table "public"."route" from "service_role";

revoke insert on table "public"."route" from "service_role";

revoke references on table "public"."route" from "service_role";

revoke select on table "public"."route" from "service_role";

revoke trigger on table "public"."route" from "service_role";

revoke truncate on table "public"."route" from "service_role";

revoke update on table "public"."route" from "service_role";

revoke delete on table "public"."van" from "anon";

revoke insert on table "public"."van" from "anon";

revoke references on table "public"."van" from "anon";

revoke select on table "public"."van" from "anon";

revoke trigger on table "public"."van" from "anon";

revoke truncate on table "public"."van" from "anon";

revoke update on table "public"."van" from "anon";

revoke delete on table "public"."van" from "authenticated";

revoke insert on table "public"."van" from "authenticated";

revoke references on table "public"."van" from "authenticated";

revoke select on table "public"."van" from "authenticated";

revoke trigger on table "public"."van" from "authenticated";

revoke truncate on table "public"."van" from "authenticated";

revoke update on table "public"."van" from "authenticated";

revoke delete on table "public"."van" from "service_role";

revoke insert on table "public"."van" from "service_role";

revoke references on table "public"."van" from "service_role";

revoke select on table "public"."van" from "service_role";

revoke trigger on table "public"."van" from "service_role";

revoke truncate on table "public"."van" from "service_role";

revoke update on table "public"."van" from "service_role";

alter table "public"."address_list" drop constraint "fk_route_addresslist";

alter table "public"."address_list" drop constraint "fk_student_addresslist";

alter table "public"."students" drop constraint "fk_route_students";

alter table "public"."address_list" drop constraint "address_list_pkey";

alter table "public"."route" drop constraint "route_pkey";

alter table "public"."van" drop constraint "van_pkey";

drop index if exists "public"."address_list_pkey";

drop index if exists "public"."route_pkey";

drop index if exists "public"."van_pkey";

drop table "public"."address_list";

drop table "public"."route";

drop table "public"."van";

alter type "public"."feed_type" rename to "feed_type__old_version_to_be_dropped";

create type "public"."feed_type" as enum ('ATTENDANCE', 'PHOTO', 'PROMOTION', 'ACTIVITY', 'VIDEO');

create table "public"."drop_off_address_order" (
    "id" uuid not null default gen_random_uuid(),
    "order" integer,
    "latitude" double precision,
    "longitude" double precision,
    "routeId" uuid,
    "studentId" uuid,
    "status" waypoint_status
);


alter table "public"."drop_off_address_order" enable row level security;

create table "public"."drop_off_route" (
    "id" uuid not null default gen_random_uuid(),
    "date" text,
    "departTime" text,
    "lat" double precision,
    "lng" double precision,
    "driver" text,
    "helper" text,
    "vanId" uuid,
    "status" route_status,
    "currentDestination" text,
    "finishedTime" text
);


alter table "public"."drop_off_route" enable row level security;

create table "public"."pick_up_route" (
    "id" uuid not null default gen_random_uuid(),
    "date" text,
    "departTime" text,
    "lat" double precision,
    "lng" double precision,
    "driver" uuid,
    "vanId" uuid,
    "status" route_status,
    "currentSchool" text,
    "finishedTime" text
);


alter table "public"."pick_up_route" enable row level security;

create table "public"."pick_up_school_order" (
    "id" uuid not null default gen_random_uuid(),
    "order" integer,
    "latitude" double precision,
    "longitude" double precision,
    "routeId" uuid,
    "status" waypoint_status,
    "studentId" uuid,
    "staffId" uuid,
    "staffType" text
);


alter table "public"."pick_up_school_order" enable row level security;

create table "public"."schools" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "address" text,
    "lat" double precision,
    "lng" double precision
);


alter table "public"."schools" enable row level security;

create table "public"."vans" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "image" text,
    "plate" text,
    "model" text,
    "year" integer,
    "seats" integer,
    "boosterSeats" integer
);


alter table "public"."vans" enable row level security;

alter table "public"."kidFeeds" alter column type type "public"."feed_type" using type::text::"public"."feed_type";

drop type "public"."feed_type__old_version_to_be_dropped";

alter table "public"."kidFeeds" drop column "photoName";

alter table "public"."kidFeeds" add column "mediaName" text;

alter table "public"."message" add column "parentId" uuid;

alter table "public"."message" add column "readyBy" jsonb;

alter table "public"."message" alter column "senderId" set data type uuid using "senderId"::uuid;

alter table "public"."students" drop column "birthdate";

alter table "public"."students" drop column "dropoffAddress";

alter table "public"."students" drop column "routeId";

alter table "public"."students" add column "birthDate" date;

alter table "public"."students" add column "currentDropOffAddress" uuid;

alter table "public"."students" add column "dropOffRouteId" uuid;

alter table "public"."students" add column "schoolId" uuid;

alter table "public"."students" add column "useDropOffService" boolean;

alter table "public"."students" alter column "parent1Email" set not null;

CREATE UNIQUE INDEX pick_up_route_pkey ON public.pick_up_route USING btree (id);

CREATE UNIQUE INDEX pick_up_school_order_pkey ON public.pick_up_school_order USING btree (id);

CREATE UNIQUE INDEX schools_pkey ON public.schools USING btree (id);

CREATE UNIQUE INDEX address_list_pkey ON public.drop_off_address_order USING btree (id);

CREATE UNIQUE INDEX route_pkey ON public.drop_off_route USING btree (id);

CREATE UNIQUE INDEX van_pkey ON public.vans USING btree (id);

alter table "public"."drop_off_address_order" add constraint "address_list_pkey" PRIMARY KEY using index "address_list_pkey";

alter table "public"."drop_off_route" add constraint "route_pkey" PRIMARY KEY using index "route_pkey";

alter table "public"."pick_up_route" add constraint "pick_up_route_pkey" PRIMARY KEY using index "pick_up_route_pkey";

alter table "public"."pick_up_school_order" add constraint "pick_up_school_order_pkey" PRIMARY KEY using index "pick_up_school_order_pkey";

alter table "public"."schools" add constraint "schools_pkey" PRIMARY KEY using index "schools_pkey";

alter table "public"."vans" add constraint "van_pkey" PRIMARY KEY using index "van_pkey";

alter table "public"."drop_off_address_order" add constraint "fk_route_addresslist" FOREIGN KEY ("routeId") REFERENCES drop_off_route(id) not valid;

alter table "public"."drop_off_address_order" validate constraint "fk_route_addresslist";

alter table "public"."drop_off_address_order" add constraint "fk_student_addresslist" FOREIGN KEY ("studentId") REFERENCES students(id) not valid;

alter table "public"."drop_off_address_order" validate constraint "fk_student_addresslist";

alter table "public"."message" add constraint "public_message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES users(id) not valid;

alter table "public"."message" validate constraint "public_message_parentId_fkey";

alter table "public"."pick_up_school_order" add constraint "public_pick_up_school_order_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES pick_up_route(id) not valid;

alter table "public"."pick_up_school_order" validate constraint "public_pick_up_school_order_routeId_fkey";

alter table "public"."pick_up_school_order" add constraint "public_pick_up_school_order_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES students(id) not valid;

alter table "public"."pick_up_school_order" validate constraint "public_pick_up_school_order_studentId_fkey";

alter table "public"."students" add constraint "public_students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES schools(id) not valid;

alter table "public"."students" validate constraint "public_students_schoolId_fkey";

alter table "public"."students" add constraint "fk_route_students" FOREIGN KEY ("dropOffRouteId") REFERENCES drop_off_route(id) not valid;

alter table "public"."students" validate constraint "fk_route_students";

grant delete on table "public"."drop_off_address_order" to "anon";

grant insert on table "public"."drop_off_address_order" to "anon";

grant references on table "public"."drop_off_address_order" to "anon";

grant select on table "public"."drop_off_address_order" to "anon";

grant trigger on table "public"."drop_off_address_order" to "anon";

grant truncate on table "public"."drop_off_address_order" to "anon";

grant update on table "public"."drop_off_address_order" to "anon";

grant delete on table "public"."drop_off_address_order" to "authenticated";

grant insert on table "public"."drop_off_address_order" to "authenticated";

grant references on table "public"."drop_off_address_order" to "authenticated";

grant select on table "public"."drop_off_address_order" to "authenticated";

grant trigger on table "public"."drop_off_address_order" to "authenticated";

grant truncate on table "public"."drop_off_address_order" to "authenticated";

grant update on table "public"."drop_off_address_order" to "authenticated";

grant delete on table "public"."drop_off_address_order" to "service_role";

grant insert on table "public"."drop_off_address_order" to "service_role";

grant references on table "public"."drop_off_address_order" to "service_role";

grant select on table "public"."drop_off_address_order" to "service_role";

grant trigger on table "public"."drop_off_address_order" to "service_role";

grant truncate on table "public"."drop_off_address_order" to "service_role";

grant update on table "public"."drop_off_address_order" to "service_role";

grant delete on table "public"."drop_off_route" to "anon";

grant insert on table "public"."drop_off_route" to "anon";

grant references on table "public"."drop_off_route" to "anon";

grant select on table "public"."drop_off_route" to "anon";

grant trigger on table "public"."drop_off_route" to "anon";

grant truncate on table "public"."drop_off_route" to "anon";

grant update on table "public"."drop_off_route" to "anon";

grant delete on table "public"."drop_off_route" to "authenticated";

grant insert on table "public"."drop_off_route" to "authenticated";

grant references on table "public"."drop_off_route" to "authenticated";

grant select on table "public"."drop_off_route" to "authenticated";

grant trigger on table "public"."drop_off_route" to "authenticated";

grant truncate on table "public"."drop_off_route" to "authenticated";

grant update on table "public"."drop_off_route" to "authenticated";

grant delete on table "public"."drop_off_route" to "service_role";

grant insert on table "public"."drop_off_route" to "service_role";

grant references on table "public"."drop_off_route" to "service_role";

grant select on table "public"."drop_off_route" to "service_role";

grant trigger on table "public"."drop_off_route" to "service_role";

grant truncate on table "public"."drop_off_route" to "service_role";

grant update on table "public"."drop_off_route" to "service_role";

grant delete on table "public"."pick_up_route" to "anon";

grant insert on table "public"."pick_up_route" to "anon";

grant references on table "public"."pick_up_route" to "anon";

grant select on table "public"."pick_up_route" to "anon";

grant trigger on table "public"."pick_up_route" to "anon";

grant truncate on table "public"."pick_up_route" to "anon";

grant update on table "public"."pick_up_route" to "anon";

grant delete on table "public"."pick_up_route" to "authenticated";

grant insert on table "public"."pick_up_route" to "authenticated";

grant references on table "public"."pick_up_route" to "authenticated";

grant select on table "public"."pick_up_route" to "authenticated";

grant trigger on table "public"."pick_up_route" to "authenticated";

grant truncate on table "public"."pick_up_route" to "authenticated";

grant update on table "public"."pick_up_route" to "authenticated";

grant delete on table "public"."pick_up_route" to "service_role";

grant insert on table "public"."pick_up_route" to "service_role";

grant references on table "public"."pick_up_route" to "service_role";

grant select on table "public"."pick_up_route" to "service_role";

grant trigger on table "public"."pick_up_route" to "service_role";

grant truncate on table "public"."pick_up_route" to "service_role";

grant update on table "public"."pick_up_route" to "service_role";

grant delete on table "public"."pick_up_school_order" to "anon";

grant insert on table "public"."pick_up_school_order" to "anon";

grant references on table "public"."pick_up_school_order" to "anon";

grant select on table "public"."pick_up_school_order" to "anon";

grant trigger on table "public"."pick_up_school_order" to "anon";

grant truncate on table "public"."pick_up_school_order" to "anon";

grant update on table "public"."pick_up_school_order" to "anon";

grant delete on table "public"."pick_up_school_order" to "authenticated";

grant insert on table "public"."pick_up_school_order" to "authenticated";

grant references on table "public"."pick_up_school_order" to "authenticated";

grant select on table "public"."pick_up_school_order" to "authenticated";

grant trigger on table "public"."pick_up_school_order" to "authenticated";

grant truncate on table "public"."pick_up_school_order" to "authenticated";

grant update on table "public"."pick_up_school_order" to "authenticated";

grant delete on table "public"."pick_up_school_order" to "service_role";

grant insert on table "public"."pick_up_school_order" to "service_role";

grant references on table "public"."pick_up_school_order" to "service_role";

grant select on table "public"."pick_up_school_order" to "service_role";

grant trigger on table "public"."pick_up_school_order" to "service_role";

grant truncate on table "public"."pick_up_school_order" to "service_role";

grant update on table "public"."pick_up_school_order" to "service_role";

grant delete on table "public"."schools" to "anon";

grant insert on table "public"."schools" to "anon";

grant references on table "public"."schools" to "anon";

grant select on table "public"."schools" to "anon";

grant trigger on table "public"."schools" to "anon";

grant truncate on table "public"."schools" to "anon";

grant update on table "public"."schools" to "anon";

grant delete on table "public"."schools" to "authenticated";

grant insert on table "public"."schools" to "authenticated";

grant references on table "public"."schools" to "authenticated";

grant select on table "public"."schools" to "authenticated";

grant trigger on table "public"."schools" to "authenticated";

grant truncate on table "public"."schools" to "authenticated";

grant update on table "public"."schools" to "authenticated";

grant delete on table "public"."schools" to "service_role";

grant insert on table "public"."schools" to "service_role";

grant references on table "public"."schools" to "service_role";

grant select on table "public"."schools" to "service_role";

grant trigger on table "public"."schools" to "service_role";

grant truncate on table "public"."schools" to "service_role";

grant update on table "public"."schools" to "service_role";

grant delete on table "public"."vans" to "anon";

grant insert on table "public"."vans" to "anon";

grant references on table "public"."vans" to "anon";

grant select on table "public"."vans" to "anon";

grant trigger on table "public"."vans" to "anon";

grant truncate on table "public"."vans" to "anon";

grant update on table "public"."vans" to "anon";

grant delete on table "public"."vans" to "authenticated";

grant insert on table "public"."vans" to "authenticated";

grant references on table "public"."vans" to "authenticated";

grant select on table "public"."vans" to "authenticated";

grant trigger on table "public"."vans" to "authenticated";

grant truncate on table "public"."vans" to "authenticated";

grant update on table "public"."vans" to "authenticated";

grant delete on table "public"."vans" to "service_role";

grant insert on table "public"."vans" to "service_role";

grant references on table "public"."vans" to "service_role";

grant select on table "public"."vans" to "service_role";

grant trigger on table "public"."vans" to "service_role";

grant truncate on table "public"."vans" to "service_role";

grant update on table "public"."vans" to "service_role";

create policy "Allow authencated users to ALL"
on "public"."drop_off_address_order"
as permissive
for all
to authenticated
using (true);


create policy "Allow authencated users to ALL"
on "public"."drop_off_route"
as permissive
for all
to authenticated
using (true);


create policy "Allow authenticated users to ALL"
on "public"."pick_up_route"
as permissive
for all
to authenticator
using (true);


create policy "allow autenticated to all"
on "public"."pick_up_school_order"
as permissive
for all
to authenticated
using (true);


create policy "Allow authencated users to ALL"
on "public"."schools"
as permissive
for all
to authenticated
using (true);


create policy "Allow authencated users to ALL"
on "public"."vans"
as permissive
for all
to authenticated
using (true);



