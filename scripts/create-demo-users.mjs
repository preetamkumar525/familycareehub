// Run from the family-care-hub folder with: node scripts/create-demo-users.mjs
// Needs DEMO_PASSWORD (at least 8 characters) in .env.local. The demo users are synthetic.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.local');

function loadEnv(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv(envPath);

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DEMO_PASSWORD'];
const missing = required.filter((name) => !env[name]);
if (missing.length > 0) {
  console.log(`Missing in .env.local: ${missing.join(', ')}`);
  process.exit(1);
}

if (env.DEMO_PASSWORD.length < 8) {
  console.log('Missing in .env.local: DEMO_PASSWORD (must be at least 8 characters)');
  process.exit(1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoUsers = [
  { role: 'coordinator', email: 'demo-coordinator@example.test', placeholder: '00000000-0000-0000-0000-000000000001' },
  { role: 'caregiver', email: 'demo-caregiver@example.test', placeholder: '00000000-0000-0000-0000-000000000002' },
  { role: 'viewer', email: 'demo-viewer@example.test', placeholder: '00000000-0000-0000-0000-000000000003' },
];

const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) {
  console.log(`Step: list users. ${listError.message}`);
  process.exit(1);
}
const existingUsers = listData?.users ?? [];

const uuids = {};
for (const user of demoUsers) {
  const wanted = user.email.toLowerCase();
  const found = existingUsers.find((u) => (u.email ?? '').toLowerCase() === wanted);
  if (found) {
    uuids[user.role] = { id: found.id, placeholder: user.placeholder };
    continue;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: env.DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.log(`Step: create user ${user.role}. ${error.message}`);
    process.exit(1);
  }
  uuids[user.role] = { id: data.user.id, placeholder: user.placeholder };
}

const seedPath = path.join(root, 'supabase', 'seed.sql');
let seed = readFileSync(seedPath, 'utf8');
for (const role of Object.keys(uuids)) {
  seed = seed.split(uuids[role].placeholder).join(uuids[role].id);
}
writeFileSync(path.join(root, 'supabase', 'seed.final.sql'), seed, 'utf8');

for (const user of demoUsers) {
  console.log(`${user.role}: ${uuids[user.role].id}`);
}
console.log('Wrote supabase/seed.final.sql. Now run it in the Supabase SQL Editor.');
