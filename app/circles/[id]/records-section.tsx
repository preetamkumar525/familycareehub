import type { ReactNode } from 'react';
import { createClient } from '../../../lib/supabase/server';
import { refillStatus, todayIso, type RefillStatus } from '../../../lib/refill';
import { AddSheet } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconFile, IconLock, IconPill } from '@/components/ui/icons';
import { AppointmentForm } from './appointment-form';
import { PrescriptionForm } from './prescription-form';
import { ReportForm } from './report-form';
import { RecipientForm } from './recipient-form';

type Role = 'coordinator' | 'caregiver' | 'viewer';

type Recipient = { id: string; full_name: string };

type Appointment = {
  id: string;
  starts_at: string | null;
  provider_name: string | null;
  location_or_link: string | null;
  purpose: string | null;
  notes: string | null;
  transport_arranged: boolean | null;
  recipient_id: string | null;
};

type Prescription = {
  id: string;
  medication_name: string;
  dose_text: string | null;
  schedule_text: string | null;
  pharmacy_name: string | null;
  prescriber_name: string | null;
  refill_date: string | null;
  recipient_id: string | null;
};

type Report = {
  id: string;
  title: string;
  report_date: string | null;
  source: string | null;
  visibility: string;
  mime_type: string | null;
  recipient_id: string | null;
};

const iconTile =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--tone-info-bg)] text-[color:var(--tone-info-fg)]';

const dateBlock =
  'flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] bg-[color:var(--tone-info-bg)] px-2 py-2 text-center text-[color:var(--tone-info-fg)]';

const bodyText = 'text-sm text-[color:var(--color-text-muted)]';

function SectionHeader({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold text-[color:var(--color-text)]">
        {title}
      </h2>
      {action}
    </div>
  );
}

function RefillBadge({ status }: { status: RefillStatus }) {
  if (status === 'overdue') return <Badge tone="danger">Refill overdue</Badge>;
  if (status === 'due_soon') return <Badge tone="warning">Refill due within 7 days</Badge>;
  if (status === 'ok') return <Badge tone="success">Refill on track</Badge>;
  return null;
}

export async function RecordsSection({ circleId, role }: { circleId: string; role: Role }) {
  const supabase = await createClient();

  const [recipientRes, appointmentRes, prescriptionRes, reportRes] = await Promise.all([
    supabase.from('care_recipients').select('id, full_name').eq('circle_id', circleId).order('created_at'),
    supabase
      .from('appointments')
      .select('id, starts_at, provider_name, location_or_link, purpose, notes, transport_arranged, recipient_id')
      .eq('circle_id', circleId)
      .order('starts_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('prescriptions')
      .select('id, medication_name, dose_text, schedule_text, pharmacy_name, prescriber_name, refill_date, recipient_id')
      .eq('circle_id', circleId)
      .order('refill_date', { nullsFirst: false }),
    supabase
      .from('reports')
      .select('id, title, report_date, source, visibility, mime_type, recipient_id')
      .eq('circle_id', circleId)
      .order('report_date', { ascending: false, nullsFirst: false }),
  ]);

  const recipients = (recipientRes.data ?? []) as Recipient[];
  const appointments = (appointmentRes.data ?? []) as Appointment[];
  const prescriptions = (prescriptionRes.data ?? []) as Prescription[];
  const reports = (reportRes.data ?? []) as Report[];

  const canWrite = role === 'coordinator' || role === 'caregiver';
  const hasRecipients = recipients.length > 0;

  const recipientName = (id: string | null) => recipients.find((r) => r.id === id)?.full_name ?? null;
  const today = todayIso();

  return (
    <div className="flex flex-col gap-6">
      {/* Care recipient */}
      <Card className="flex flex-col gap-4">
        <SectionHeader
          id="recipient-heading"
          title="Care recipient"
          action={
            canWrite && !hasRecipients ? (
              <AddSheet triggerLabel="+ Add recipient" title="Add recipient">
                <RecipientForm circleId={circleId} />
              </AddSheet>
            ) : null
          }
        />
        {hasRecipients ? (
          <ul className="flex flex-col gap-3">
            {recipients.map((r) => (
              <li key={r.id}>
                <Card className="flex items-center gap-4">
                  <span className={iconTile} aria-hidden="true">
                    <IconFile />
                  </span>
                  <p className="text-base font-medium text-[color:var(--color-text)]">{r.full_name}</p>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No care recipient yet."
            body={
              canWrite
                ? 'Add the person this circle cares for to start recording appointments and prescriptions.'
                : 'A coordinator or caregiver can add the person this circle cares for.'
            }
          />
        )}
      </Card>

      {/* Appointments */}
      <Card className="flex flex-col gap-4" aria-labelledby="appointments-heading">
        <SectionHeader
          id="appointments-heading"
          title="Appointments"
          action={
            canWrite && hasRecipients ? (
              <AddSheet triggerLabel="+ Add appointment" title="Add appointment">
                <AppointmentForm circleId={circleId} recipients={recipients} />
              </AddSheet>
            ) : null
          }
        />
        {appointments.length === 0 ? (
          <EmptyState
            title="No appointments yet."
            body={
              canWrite && hasRecipients
                ? 'Add the first appointment for this care recipient.'
                : 'Appointments recorded by coordinators or caregivers will appear here.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {appointments.map((a) => {
              const when = a.starts_at ? new Date(a.starts_at) : null;
              return (
                <li key={a.id}>
                  <Card className="flex gap-4">
                    {when ? (
                      <div className={dateBlock}>
                        <span className="text-xl font-bold leading-none">
                          {when.toLocaleDateString('en-GB', { day: 'numeric' })}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {when.toLocaleDateString('en-GB', { month: 'short' })}
                        </span>
                      </div>
                    ) : (
                      <div className={dateBlock}>
                        <span className="text-xs font-semibold">No date</span>
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-base font-semibold text-[color:var(--color-text)]">
                          {a.provider_name ?? 'Appointment'}
                        </p>
                        <Badge tone={a.transport_arranged ? 'success' : 'neutral'}>
                          {a.transport_arranged ? 'Transport arranged' : 'Transport not arranged'}
                        </Badge>
                      </div>
                      {when && <p className={bodyText}>Time: {when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
                      {a.purpose && <p className={bodyText}>Purpose: {a.purpose}</p>}
                      {a.location_or_link && <p className={bodyText}>Location: {a.location_or_link}</p>}
                      {a.notes && <p className={bodyText}>Notes: {a.notes}</p>}
                      {recipientName(a.recipient_id) && (
                        <p className={bodyText}>For: {recipientName(a.recipient_id)}</p>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Prescriptions */}
      <Card className="flex flex-col gap-4" aria-labelledby="prescriptions-heading">
        <SectionHeader
          id="prescriptions-heading"
          title="Prescriptions"
          action={
            canWrite && hasRecipients ? (
              <AddSheet triggerLabel="+ Add prescription" title="Add prescription">
                <PrescriptionForm circleId={circleId} recipients={recipients} />
              </AddSheet>
            ) : null
          }
        />
        <p className="text-sm text-[color:var(--color-text-muted)]">Recorded as written. Not dosing advice.</p>
        {prescriptions.length === 0 ? (
          <EmptyState
            title="No prescriptions yet."
            body={
              canWrite && hasRecipients
                ? 'Add the first prescription exactly as the prescriber wrote it.'
                : 'Prescriptions recorded by coordinators or caregivers will appear here.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {prescriptions.map((p) => {
              const status = refillStatus(p.refill_date, today);
              return (
                <li key={p.id}>
                  <Card className="flex gap-4">
                    <span className={iconTile} aria-hidden="true">
                      <IconPill />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-base font-semibold text-[color:var(--color-text)]">{p.medication_name}</p>
                        <RefillBadge status={status} />
                      </div>
                      <p className={`${bodyText} whitespace-pre-wrap`}>Dose, as written: {p.dose_text}</p>
                      <p className={`${bodyText} whitespace-pre-wrap`}>Schedule, as written: {p.schedule_text}</p>
                      {p.pharmacy_name && <p className={bodyText}>Pharmacy: {p.pharmacy_name}</p>}
                      {p.prescriber_name && <p className={bodyText}>Prescriber: {p.prescriber_name}</p>}
                      {p.refill_date && <p className={bodyText}>Refill date: {p.refill_date}</p>}
                      {recipientName(p.recipient_id) && (
                        <p className={bodyText}>For: {recipientName(p.recipient_id)}</p>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Reports */}
      <Card className="flex flex-col gap-4" aria-labelledby="reports-heading">
        <SectionHeader
          id="reports-heading"
          title="Reports"
          action={
            canWrite && hasRecipients ? (
              <AddSheet triggerLabel="+ Add report" title="Add report">
                <ReportForm circleId={circleId} recipients={recipients} canSetRestricted={canWrite} />
              </AddSheet>
            ) : null
          }
        />
        {reports.length === 0 ? (
          <EmptyState
            title="No reports yet."
            body={
              canWrite && hasRecipients
                ? 'Upload the first report as a PDF or image.'
                : 'Reports uploaded by coordinators or caregivers will appear here.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Card className="flex gap-4">
                  <span className={iconTile} aria-hidden="true">
                    <IconFile />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-base font-semibold text-[color:var(--color-text)]">{r.title}</p>
                      {r.visibility === 'restricted' ? (
                        <Badge tone="accent" className="gap-1">
                          <IconLock className="h-3.5 w-3.5" />
                          Restricted
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Standard</Badge>
                      )}
                    </div>
                    {r.report_date && <p className={bodyText}>Report date: {r.report_date}</p>}
                    {r.source && <p className={bodyText}>Source: {r.source}</p>}
                    {recipientName(r.recipient_id) && (
                      <p className={bodyText}>For: {recipientName(r.recipient_id)}</p>
                    )}
                    <a
                      href={`/reports/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-black underline"
                    >
                      Open
                    </a>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
