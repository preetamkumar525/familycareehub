-- Privacy fixes after 0001-0005.
-- 1) Caregivers cannot re-point a report at another circle's file.
-- 2) Only a coordinator can change a report's visibility or stored file.
-- 3) Viewers can read a stored file only when a standard report row points at it.

drop policy if exists "reports_update_editor" on reports;
create policy "reports_update_editor" on reports for update
  using (circle_role(circle_id) in ('coordinator','caregiver'))
  with check (circle_role(circle_id) in ('coordinator','caregiver')
              and storage_circle_id(storage_path) = circle_id);

create or replace function reports_update_guard() returns trigger
language plpgsql set search_path = public
as $$
begin
  if (new.visibility is distinct from old.visibility
      or new.storage_path is distinct from old.storage_path)
     and circle_role(new.circle_id) is distinct from 'coordinator' then
    raise exception 'Only a coordinator can change report visibility or file';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_update_guard on reports;
create trigger reports_update_guard before update on reports
  for each row execute function reports_update_guard();

drop policy if exists "care_docs_select" on storage.objects;
create policy "care_docs_select" on storage.objects for select
  using (bucket_id = 'care-documents'
         and storage_circle_id(name) is not null
         and is_circle_member(storage_circle_id(name))
         and (circle_role(storage_circle_id(name)) in ('coordinator','caregiver')
              or exists (select 1 from reports r
                         where r.storage_path = name and r.visibility = 'standard')));

-- Anonymous callers must not probe report visibility by storage path.
revoke execute on function is_restricted_document(text) from public, anon;
