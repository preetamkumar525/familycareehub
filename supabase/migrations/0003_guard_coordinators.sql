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
