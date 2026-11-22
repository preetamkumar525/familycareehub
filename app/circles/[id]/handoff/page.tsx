import { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { PrintButton } from './print-button';

type Member = {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-lg">Loading summary...</p>}>
      <HandoffContent params={params} />
    </Suspense>
  );
}

async function HandoffContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // RLS: returns no row unless the signed-in user is a member of this circle.
  const { data: circle } = await supabase.from('care_circles').select('name').eq('id', id).maybeSingle();
  if (!circle) {
    notFound();
  }

  const { data: recipientRows } = await supabase
    .from('care_recipients')
    .select('full_name, date_of_birth')
    .eq('circle_id', id)
    .order('full_name');

  const { data: prescriptionRows } = await supabase
    .from('prescriptions')
    .select('medication_name, dose_text, schedule_text, pharmacy_name, prescriber_name, refill_date')
    .eq('circle_id', id)
    .order('medication_name');

  const { data: appointmentRows } = await supabase
    .from('appointments')
    .select('starts_at, provider_name, location_or_link, purpose, transport_arranged')
    .eq('circle_id', id)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(20);

  const { data: taskRows } = await supabase
    .from('tasks')
    .select('title, due_date, status, owner_id')
    .eq('circle_id', id)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false });

  // Member names for task owners. The RPC returns members only and enforces that itself.
  const { data: memberData } = await supabase.rpc('list_circle_members', { p_circle: id });
  const members = (memberData ?? []) as Member[];
  const nameById = new Map(members.map((m) => [m.user_id, m.display_name || 'Assigned member']));

  const recipients = recipientRows ?? [];
  const prescriptions = prescriptionRows ?? [];
  const appointments = appointmentRows ?? [];
  const tasks = taskRows ?? [];

  return (
    <main className="mx-auto flex w-full max-w-[800px] flex-col gap-6 bg-white p-6 font-sans text-black print:gap-4 print:p-0">
      <div className="print:hidden">
        <PrintButton />
      </div>

      <span className="w-fit border border-black px-2 py-1 text-sm font-semibold text-black">SAMPLE DATA</span>
      <p className="text-base leading-7 text-black">
        This app records what clinicians ordered. It does not give medical advice. Questions about treatment go to the
        prescriber.
      </p>

      <header className="flex flex-col gap-2 border-b border-black pb-4">
        <h1 className="text-3xl font-semibold tracking-tight text-black">Care handoff summary</h1>
        <p className="text-xl text-black">{circle.name}</p>
        <p className="text-base text-black">Generated: {new Date().toLocaleDateString()}</p>
      </header>

      <section className="flex flex-col gap-3 border-b border-zinc-300 pb-6">
        <h2 className="text-xl font-semibold text-black">Care recipient</h2>
        {recipients.length === 0 ? (
          <p className="text-lg text-black">None recorded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-300">
            {recipients.map((r, i) => (
              <li key={i} className="flex flex-col gap-2 py-3 text-lg text-black print:break-inside-avoid">
                <p className="font-semibold">{r.full_name}</p>
                <dl className="flex flex-col gap-1">
                  {r.date_of_birth && <Field label="Date of birth" value={r.date_of_birth} />}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 border-b border-zinc-300 pb-6">
        <h2 className="text-xl font-semibold text-black">Current prescriptions</h2>
        <p className="text-base text-black">Recorded as written. Not dosing advice.</p>
        {prescriptions.length === 0 ? (
          <p className="text-lg text-black">None recorded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-300">
            {prescriptions.map((p, i) => (
              <li key={i} className="flex flex-col gap-2 py-3 text-lg text-black print:break-inside-avoid">
                <p className="font-semibold">{p.medication_name}</p>
                <dl className="flex flex-col gap-1">
                  {p.dose_text && <Field label="Dose" value={p.dose_text} />}
                  {p.schedule_text && <Field label="Schedule" value={p.schedule_text} />}
                  {p.prescriber_name && <Field label="Prescriber" value={p.prescriber_name} />}
                  {p.pharmacy_name && <Field label="Pharmacy" value={p.pharmacy_name} />}
                  {p.refill_date && <Field label="Refill date" value={p.refill_date} />}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 border-b border-zinc-300 pb-6">
        <h2 className="text-xl font-semibold text-black">Upcoming appointments</h2>
        {appointments.length === 0 ? (
          <p className="text-lg text-black">None recorded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-300">
            {appointments.map((a, i) => (
              <li key={i} className="flex flex-col gap-2 py-3 text-lg text-black print:break-inside-avoid">
                <p className="font-semibold">{a.starts_at ? new Date(a.starts_at).toLocaleString() : 'Time not set'}</p>
                <dl className="flex flex-col gap-1">
                  {a.provider_name && <Field label="Provider" value={a.provider_name} />}
                  {a.purpose && <Field label="Purpose" value={a.purpose} />}
                  {a.location_or_link && <Field label="Location" value={a.location_or_link} />}
                  <Field label="Transport arranged" value={a.transport_arranged ? 'Yes' : 'No'} />
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 pb-2">
        <h2 className="text-xl font-semibold text-black">Open tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-lg text-black">None recorded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-300">
            {tasks.map((t, i) => (
              <li key={i} className="flex flex-col gap-2 py-3 text-lg text-black print:break-inside-avoid">
                <p className="font-semibold">{t.title}</p>
                <dl className="flex flex-col gap-1">
                  <Field label="Status" value={t.status} />
                  {t.due_date && <Field label="Due" value={t.due_date} />}
                  {t.owner_id && <Field label="Owner" value={nameById.get(t.owner_id) ?? 'Unknown'} />}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 text-base sm:grid-cols-[9rem_1fr]">
      <dt className="font-medium text-zinc-700">{label}</dt>
      <dd className="text-black">{value}</dd>
    </div>
  );
}
