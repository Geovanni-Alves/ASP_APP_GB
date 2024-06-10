CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


create policy "Allow authenticated users to read and create 1io9m69_0"
on "storage"."objects"
as permissive
for select
to authenticated
using ((bucket_id = 'photos'::text));


create policy "Allow authenticated users to read and create 1io9m69_1"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'photos'::text));



