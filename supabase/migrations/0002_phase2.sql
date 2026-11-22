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
