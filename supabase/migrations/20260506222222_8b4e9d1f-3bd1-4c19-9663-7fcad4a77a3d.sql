insert into storage.buckets (id, name, public) values ('catalogs','catalogs',true) on conflict (id) do nothing;

create policy "Public read catalogs" on storage.objects for select using (bucket_id = 'catalogs');
create policy "Admins upload catalogs" on storage.objects for insert to authenticated with check (bucket_id = 'catalogs' and (has_role(auth.uid(),'super_admin'::app_role) or has_role(auth.uid(),'admin'::app_role)));
create policy "Admins update catalogs" on storage.objects for update to authenticated using (bucket_id = 'catalogs' and (has_role(auth.uid(),'super_admin'::app_role) or has_role(auth.uid(),'admin'::app_role)));
create policy "Super admins delete catalogs" on storage.objects for delete to authenticated using (bucket_id = 'catalogs' and has_role(auth.uid(),'super_admin'::app_role));