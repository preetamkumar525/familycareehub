-- SYNTHETIC SAMPLE DATA ONLY. Not real people or records.
--
-- Setup steps:
--   (a) In Supabase Dashboard > Authentication > Users, create three users, for example:
--       demo-coordinator@example.test, demo-caregiver@example.test, demo-viewer@example.test
--       (set passwords you control).
--   (b) Copy each user's UUID from the Users list.
--   (c) Replace the placeholder UUIDs below with those real auth user ids.
--   (d) Run this file in the Supabase SQL editor.

-- Placeholder user ids: replace with real auth user ids
--   coordinator = '00000000-0000-0000-0000-000000000001'
--   caregiver   = '00000000-0000-0000-0000-000000000002'
--   viewer      = '00000000-0000-0000-0000-000000000003'

insert into profiles (id, display_name, city) values
  ('00000000-0000-0000-0000-000000000001', 'Alex Sample', 'City A'),
  ('00000000-0000-0000-0000-000000000002', 'Bea Sample', 'City B'),
  ('00000000-0000-0000-0000-000000000003', 'Chris Sample', 'City C')
on conflict (id) do update set display_name = excluded.display_name, city = excluded.city;

insert into care_circles (id, name, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Demo Family Care Circle', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into care_circle_members (circle_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'coordinator'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'caregiver'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'viewer')
on conflict (circle_id, user_id) do nothing;

insert into care_recipients (id, circle_id, full_name, date_of_birth, created_by) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Mary Example', '1940-01-01', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into appointments (id, circle_id, recipient_id, starts_at, provider_name, location_or_link, purpose, notes, transport_arranged, created_by) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', now() + interval '14 days', 'Dr. Sample Cardiology', 'Sample Clinic, Room 2', 'Routine follow-up', 'Sample note', true, '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', now() + interval '45 days', 'Dr. Sample Cardiology', 'Sample Clinic, Room 2', 'Blood test review', 'Sample note', false, '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into prescriptions (id, circle_id, recipient_id, medication_name, dose_text, schedule_text, pharmacy_name, prescriber_name, refill_date, created_by) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sample Medicine A', '1 tablet', 'Once daily, morning', 'Sample Pharmacy', 'Dr. Sample', current_date + 30, '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Sample Medicine B', '1 capsule', 'Once daily, evening', 'Sample Pharmacy', 'Dr. Sample', current_date + 60, '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into tasks (id, circle_id, title, owner_id, due_date, status, created_by) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Book follow-up appointment', '00000000-0000-0000-0000-000000000001', current_date + 7, 'todo', '00000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Pick up prescription', '00000000-0000-0000-0000-000000000002', current_date + 3, 'in_progress', '00000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Send last month report to GP', '00000000-0000-0000-0000-000000000003', current_date - 1, 'done', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
