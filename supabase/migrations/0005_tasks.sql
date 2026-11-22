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
