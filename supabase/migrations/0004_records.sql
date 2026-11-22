-- Phase 3: reports with a visibility flag, and a private storage bucket. Synthetic-only prototype.

create table reports (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references care_circles(id) on delete cascade,
  recipient_id uuid references care_recipients(id) on delete cascade,
  title text not null,
  report_date date,
  source text,
  visibility text not null default 'standard' check (visibility in ('standard','restricted')),
  storage_path text not null unique,
  mime_type text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on reports (circle_id);

-- Storage helpers. Object names look like <circle_id>/<report_id>/<file>.
-- Security definer so they can read reports without the caller's RLS getting in the way.
create function storage_circle_id(object_name text) returns uuid
language plpgsql immutable set search_path = public
as $$
begin
  return (string_to_array(object_name, '/'))[1]::uuid;
exception when others then
  return null;
end;
$$;

create function is_restricted_document(object_name text) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from reports r
    where r.storage_path = object_name and r.visibility = 'restricted'
  );
$$;

alter table reports enable row level security;

-- Restricted reports are readable only by coordinators and caregivers.
create policy "reports_select_visible" on reports for select
  using (is_circle_member(circle_id)
         and (visibility = 'standard' or circle_role(circle_id) in ('coordinator','caregiver')));
create policy "reports_insert_editor" on reports for insert
  with check (circle_role(circle_id) in ('coordinator','caregiver')
              and created_by = auth.uid()
              and storage_circle_id(storage_path) = circle_id);
create policy "reports_update_editor" on reports for update
  using (circle_role(circle_id) in ('coordinator','caregiver'))
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "reports_delete_coordinator" on reports for delete
  using (circle_role(circle_id) = 'coordinator');

create trigger audit_reports after insert or update or delete on reports
  for each row execute function log_activity();

-- Private bucket: no public URLs, 10 MB limit, PDF and common image types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('care-documents', 'care-documents', false, 10485760,
        array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;

create policy "care_docs_select" on storage.objects for select
  using (bucket_id = 'care-documents'
         and storage_circle_id(name) is not null
         and is_circle_member(storage_circle_id(name))
         and (not is_restricted_document(name)
              or circle_role(storage_circle_id(name)) in ('coordinator','caregiver')));
create policy "care_docs_insert" on storage.objects for insert
  with check (bucket_id = 'care-documents'
         and storage_circle_id(name) is not null
         and circle_role(storage_circle_id(name)) in ('coordinator','caregiver'));
create policy "care_docs_delete" on storage.objects for delete
  using (bucket_id = 'care-documents'
         and circle_role(storage_circle_id(name)) = 'coordinator');
