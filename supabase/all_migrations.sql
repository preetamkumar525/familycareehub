-- all_migrations.sql: 0001 to 0006 concatenated in order. Run once in the Supabase SQL Editor on a fresh project.

-- ===== supabase/migrations/0001_init.sql =====
-- Synthetic-only schema for a hackathon prototype. Not HIPAA/GDPR compliant.

-- Tables ---------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  city text
);

create table care_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table care_circle_members (
  circle_id uuid not null references care_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('coordinator','caregiver','viewer')),
  primary key (circle_id, user_id)
);

create table care_recipients (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references care_circles(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references care_circles(id) on delete cascade,
  recipient_id uuid references care_recipients(id) on delete cascade,
  starts_at timestamptz,
  provider_name text,
  location_or_link text,
  purpose text,
  notes text,
  transport_arranged boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references care_circles(id) on delete cascade,
  recipient_id uuid references care_recipients(id) on delete cascade,
  medication_name text not null,
  dose_text text,
  schedule_text text,
  pharmacy_name text,
  prescriber_name text,
  refill_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references care_circles(id) on delete cascade,
  title text not null,
  owner_id uuid references auth.users(id),
  due_date date,
  status text not null default 'todo' check (status in ('todo','in_progress','done','blocked')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references care_circles(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- Indexes --------------------------------------------------------------

create index on care_circle_members (circle_id);
create index on care_recipients (circle_id);
create index on appointments (circle_id);
create index on prescriptions (circle_id);
create index on tasks (circle_id);
create index on activity_events (circle_id);

-- Helper functions -----------------------------------------------------

create function is_circle_member(circle uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from care_circle_members
    where circle_id = circle and user_id = auth.uid()
  );
$$;

create function circle_role(circle uuid) returns text
language sql stable security definer set search_path = public
as $$
  select m.role from care_circle_members m
  where m.circle_id = circle and m.user_id = auth.uid();
$$;

-- Row level security ---------------------------------------------------

alter table profiles enable row level security;
alter table care_circles enable row level security;
alter table care_circle_members enable row level security;
alter table care_recipients enable row level security;
alter table appointments enable row level security;
alter table prescriptions enable row level security;
alter table tasks enable row level security;
alter table activity_events enable row level security;

-- profiles
create policy "profiles_select_own" on profiles for select
  using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert
  with check (id = auth.uid());
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());

-- care_circles (creation goes through create_care_circle)
create policy "care_circles_select_member" on care_circles for select
  using (is_circle_member(id));
create policy "care_circles_update_coordinator" on care_circles for update
  using (circle_role(id) = 'coordinator')
  with check (circle_role(id) = 'coordinator');

-- care_circle_members
create policy "members_select_member" on care_circle_members for select
  using (is_circle_member(circle_id));
create policy "members_insert_coordinator" on care_circle_members for insert
  with check (circle_role(circle_id) = 'coordinator');
create policy "members_update_coordinator" on care_circle_members for update
  using (circle_role(circle_id) = 'coordinator')
  with check (circle_role(circle_id) = 'coordinator');
create policy "members_delete_coordinator" on care_circle_members for delete
  using (circle_role(circle_id) = 'coordinator');

-- care_recipients, appointments, prescriptions, tasks
create policy "care_recipients_select_member" on care_recipients for select
  using (is_circle_member(circle_id));
create policy "care_recipients_write_editor" on care_recipients for insert
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "care_recipients_update_editor" on care_recipients for update
  using (circle_role(circle_id) in ('coordinator','caregiver'))
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "care_recipients_delete_coordinator" on care_recipients for delete
  using (circle_role(circle_id) = 'coordinator');

create policy "appointments_select_member" on appointments for select
  using (is_circle_member(circle_id));
create policy "appointments_insert_editor" on appointments for insert
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "appointments_update_editor" on appointments for update
  using (circle_role(circle_id) in ('coordinator','caregiver'))
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "appointments_delete_coordinator" on appointments for delete
  using (circle_role(circle_id) = 'coordinator');

create policy "prescriptions_select_member" on prescriptions for select
  using (is_circle_member(circle_id));
create policy "prescriptions_insert_editor" on prescriptions for insert
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "prescriptions_update_editor" on prescriptions for update
  using (circle_role(circle_id) in ('coordinator','caregiver'))
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "prescriptions_delete_coordinator" on prescriptions for delete
  using (circle_role(circle_id) = 'coordinator');

create policy "tasks_select_member" on tasks for select
  using (is_circle_member(circle_id));
create policy "tasks_insert_editor" on tasks for insert
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "tasks_update_editor" on tasks for update
  using (circle_role(circle_id) in ('coordinator','caregiver'))
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "tasks_delete_coordinator" on tasks for delete
  using (circle_role(circle_id) = 'coordinator');

-- activity_events: read only for members; writes come from the trigger
create policy "activity_events_select_member" on activity_events for select
  using (is_circle_member(circle_id));

-- Circle creation ------------------------------------------------------

create function create_care_circle(circle_name text) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into care_circles (name, created_by)
  values (circle_name, auth.uid())
  returning id into new_id;

  insert into care_circle_members (circle_id, user_id, role)
  values (new_id, auth.uid(), 'coordinator');

  return new_id;
end;
$$;

revoke execute on function create_care_circle(text) from public;
grant execute on function create_care_circle(text) to authenticated;
revoke execute on function create_care_circle(text) from anon;

-- Audit trigger --------------------------------------------------------

create function log_activity() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    insert into activity_events (circle_id, actor_id, action, entity_type, entity_id)
    values (OLD.circle_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, OLD.id);
    return null;
  else
    insert into activity_events (circle_id, actor_id, action, entity_type, entity_id)
    values (NEW.circle_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, NEW.id);
    return NEW;
  end if;
end;
$$;

create trigger audit_tasks after insert or update or delete on tasks
  for each row execute function log_activity();
create trigger audit_appointments after insert or update or delete on appointments
  for each row execute function log_activity();
create trigger audit_prescriptions after insert or update or delete on prescriptions
  for each row execute function log_activity();
create trigger audit_care_recipients after insert or update or delete on care_recipients
  for each row execute function log_activity();

-- ===== supabase/migrations/0002_phase2.sql =====
-- Phase 2: sign-in, invites and member list. Synthetic-only prototype.

-- Create a profile row whenever a user signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, display_name, city)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), null)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Coordinator invites an existing account by email.
create or replace function add_member_by_email(p_circle uuid, p_email text, p_role text) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if circle_role(p_circle) is distinct from 'coordinator' then
    raise exception 'only a coordinator can invite members';
  end if;
  if p_role not in ('coordinator','caregiver','viewer') then
    raise exception 'invalid role';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No account with that email. Ask them to sign up first.';
  end if;
  insert into care_circle_members (circle_id, user_id, role)
  values (p_circle, v_user, p_role)
  on conflict (circle_id, user_id) do update set role = excluded.role;
end;
$$;

revoke execute on function add_member_by_email(uuid, text, text) from public;
revoke execute on function add_member_by_email(uuid, text, text) from anon;
grant execute on function add_member_by_email(uuid, text, text) to authenticated;

-- Members of a circle with display name and email. Members only.
create or replace function list_circle_members(p_circle uuid)
returns table(user_id uuid, role text, display_name text, email text)
language plpgsql security definer set search_path = public
as $$
begin
  if not is_circle_member(p_circle) then
    raise exception 'not a member';
  end if;
  return query
    select m.user_id, m.role::text, p.display_name::text, u.email::text
    from care_circle_members m
    left join profiles p on p.id = m.user_id
    left join auth.users u on u.id = m.user_id
    where m.circle_id = p_circle
    order by m.role, p.display_name;
end;
$$;

revoke execute on function list_circle_members(uuid) from public;
revoke execute on function list_circle_members(uuid) from anon;
grant execute on function list_circle_members(uuid) to authenticated;

-- ===== supabase/migrations/0003_guard_coordinators.sql =====
-- Phase 2 fix: a circle must always keep at least one coordinator, and a
-- coordinator cannot remove or demote their own membership. Synthetic-only prototype.

create function guard_coordinator_membership() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if OLD.role <> 'coordinator' then
    if TG_OP = 'DELETE' then
      return OLD;
    end if;
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and NEW.role = 'coordinator'
     and NEW.circle_id = OLD.circle_id and NEW.user_id = OLD.user_id then
    return NEW;
  end if;

  if OLD.user_id = auth.uid() then
    raise exception 'You cannot remove or demote yourself. Ask another coordinator.';
  end if;

  if not exists (
    select 1 from care_circle_members
    where circle_id = OLD.circle_id and role = 'coordinator' and user_id <> OLD.user_id
  ) then
    raise exception 'A circle must keep at least one coordinator.';
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger guard_coordinator before update or delete on care_circle_members
  for each row execute function guard_coordinator_membership();

-- ===== supabase/migrations/0004_records.sql =====
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

-- ===== supabase/migrations/0005_tasks.sql =====
-- Phase 4/5: tasks, owner check, and an activity read policy if missing.
-- tasks already exists from 0001_init.sql, so this migration alters it instead of creating it.

-- Columns missing from the 0001 definition.
alter table tasks
  add column if not exists recipient_id uuid references care_recipients(id) on delete cascade,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id);

-- owner_id: match the spec's ON DELETE SET NULL (0001 had no action).
alter table tasks drop constraint if exists tasks_owner_id_fkey;
alter table tasks add constraint tasks_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

-- Policies: replace the 0001 versions so the insert rule also requires created_by = auth.uid().
drop policy if exists "tasks_select_member" on tasks;
drop policy if exists "tasks_insert_editor" on tasks;
drop policy if exists "tasks_update_editor" on tasks;
drop policy if exists "tasks_delete_coordinator" on tasks;

create policy "tasks_select_member" on tasks for select
  using (is_circle_member(circle_id));
create policy "tasks_insert_editor" on tasks for insert
  with check (circle_role(circle_id) in ('coordinator','caregiver') and created_by = auth.uid());
create policy "tasks_update_editor" on tasks for update
  using (circle_role(circle_id) in ('coordinator','caregiver'))
  with check (circle_role(circle_id) in ('coordinator','caregiver'));
create policy "tasks_delete_coordinator" on tasks for delete
  using (circle_role(circle_id) = 'coordinator');

-- Owner must be a member of the same circle (or null).
create or replace function task_owner_check() returns trigger language plpgsql set search_path = public as $$
begin
  if new.owner_id is not null and not exists (
    select 1 from care_circle_members m
    where m.circle_id = new.circle_id and m.user_id = new.owner_id
  ) then
    raise exception 'Task owner must be a member of this circle';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_owner_check on tasks;
create trigger tasks_owner_check before insert or update on tasks
  for each row execute function task_owner_check();

-- Record who completed a task and when. OLD is only read on UPDATE.
create or replace function task_completion_stamp() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      new.completed_at := now();
      new.completed_by := auth.uid();
    end if;
  elsif new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
    new.completed_by := auth.uid();
  elsif new.status <> 'done' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_completion_stamp on tasks;
create trigger tasks_completion_stamp before insert or update on tasks
  for each row execute function task_completion_stamp();

-- audit_tasks already exists from 0001_init.sql (same definition), so it is not recreated here.
-- activity_events_select_member already exists from 0001_init.sql (is_circle_member(circle_id)), so no activity policy is added.

-- Emails are visible to coordinators only (replaces the 0002 definition, which 0005 supersedes).
create or replace function list_circle_members(p_circle uuid)
returns table(user_id uuid, role text, display_name text, email text)
language plpgsql security definer set search_path = public
as $$
begin
  if not is_circle_member(p_circle) then
    raise exception 'not a member';
  end if;
  return query
    select m.user_id, m.role::text, p.display_name::text,
           case when circle_role(p_circle) = 'coordinator' then u.email::text else null end
    from care_circle_members m
    left join profiles p on p.id = m.user_id
    left join auth.users u on u.id = m.user_id
    where m.circle_id = p_circle
    order by m.role, p.display_name;
end;
$$;

-- ===== supabase/migrations/0006_privacy_fixes.sql =====
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
notify pgrst, 'reload schema';
