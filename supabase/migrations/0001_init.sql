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
