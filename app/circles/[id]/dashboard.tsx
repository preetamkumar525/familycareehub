import type { ReactNode } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { daysBetween, refillStatus, todayIso } from '../../../lib/refill';
import { relativeTime } from '../../../lib/relative-time';
import { Card } from '../../../components/ui/card';
import { Badge, type BadgeTone } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';
import { IconCalendar, IconPill, IconTask } from '../../../components/ui/icons';

type Role = 'coordinator' | 'caregiver' | 'viewer';

type Appointment = {
  id: string;
  starts_at: string | null;
  provider_name: string | null;
  purpose: string | null;
};

type OpenTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

type Prescription = {
  id: string;
  medication_name: string;
  refill_date: string | null;
};

type ActivityEvent = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  created_at: string;
};

type Member = { user_id: string; display_name: string | null };

const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

// Status badge tones. Unknown statuses fall back to neutral.
const STATUS_TONES: Record<string, BadgeTone> = {
  todo: 'neutral',
  in_progress: 'info',
  blocked: 'warning',
  done: 'success',
};

// Day number and short month for the date block, taken from en-GB date parts.
function dateBlockParts(iso: string | null): { day: string; month: string } | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return { day, month };
}

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconClassName,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  iconClassName: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-full)] ${iconClassName}`}
      >
        {icon}
      </span>
      <p className="text-sm text-[color:var(--color-text-muted)]">{label}</p>
      <p className="text-4xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

export async function Dashboard({ circleId }: { circleId: string; role: Role }) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const today = todayIso();

  const [apptRes, taskRes, rxRes, activityRes, memberRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, starts_at, provider_name, purpose')
      .eq('circle_id', circleId)
      .gte('starts_at', nowIso)
      .order('starts_at')
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, due_date, status')
      .eq('circle_id', circleId)
      .neq('status', 'done')
      .order('due_date', { nullsFirst: false })
      .limit(10),
    supabase
      .from('prescriptions')
      .select('id, medication_name, refill_date')
      .eq('circle_id', circleId)
      .not('refill_date', 'is', null)
      .order('refill_date')
      .limit(20),
    supabase
      .from('activity_events')
      .select('id, actor_id, action, entity_type, created_at')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.rpc('list_circle_members', { p_circle: circleId }),
  ]);

  const appointments = (apptRes.data ?? []) as Appointment[];
  const openTasks = (taskRes.data ?? []) as OpenTask[];
  const dueRefills = ((rxRes.data ?? []) as Prescription[]).filter((p) => {
    const status = refillStatus(p.refill_date, today);
    return status === 'due_soon' || status === 'overdue';
  });
  const activity = (activityRes.data ?? []) as ActivityEvent[];
  const members = (memberRes.data ?? []) as Member[];

  const memberName = (userId: string | null) => {
    if (!userId) {
      return 'A member';
    }
    return members.find((m) => m.user_id === userId)?.display_name || 'A member';
  };

  const nextAppointment = appointments[0];
  const laterAppointments = appointments.slice(1);
  const nextParts = nextAppointment ? dateBlockParts(nextAppointment.starts_at) : null;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-[color:var(--color-text-muted)]">
        Organises information only. No medical advice.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<IconCalendar />}
          label="Upcoming appointments"
          value={appointments.length}
          iconClassName="bg-[color:var(--tone-info-bg)] text-[color:var(--tone-info-fg)]"
        />
        <StatCard
          icon={<IconTask />}
          label="Open tasks"
          value={openTasks.length}
          iconClassName="bg-[color:var(--tone-accent-bg)] text-[color:var(--tone-accent-fg)]"
        />
        <StatCard
          icon={<IconPill />}
          label="Refills due"
          value={dueRefills.length}
          iconClassName="bg-[color:var(--tone-warning-bg)] text-[color:var(--tone-warning-fg)]"
        />
      </div>

      <Block id="next-appointment" title="Next appointment">
        {nextAppointment ? (
          <Card className="flex items-start gap-4">
            <div className="flex w-16 shrink-0 flex-col items-center rounded-[var(--radius-lg)] bg-[color:var(--color-primary)] py-2 text-[color:var(--color-on-primary)]">
              {nextParts ? (
                <>
                  <span className="text-2xl font-semibold tabular-nums">{nextParts.day}</span>
                  <span className="text-xs uppercase tracking-wide">{nextParts.month}</span>
                </>
              ) : (
                <span className="text-xs">No date</span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-base font-medium break-words">
                {nextAppointment.starts_at
                  ? new Date(nextAppointment.starts_at).toLocaleString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'No date'}
              </p>
              {nextAppointment.provider_name && (
                <p className="text-sm text-[color:var(--color-text-muted)] break-words">
                  Provider: {nextAppointment.provider_name}
                </p>
              )}
              {nextAppointment.purpose && (
                <p className="text-sm text-[color:var(--color-text-muted)] break-words">
                  Purpose: {nextAppointment.purpose}
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-start gap-3">
            <p className="text-base text-[color:var(--color-text-muted)]">No upcoming appointments.</p>
            <Link
              href="?tab=records"
              className="inline-flex items-center rounded-[var(--radius-full)] bg-[color:var(--color-primary)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[color:var(--color-on-primary)] shadow-[var(--shadow-soft)]"
            >
              Add an appointment
            </Link>
          </Card>
        )}

        {laterAppointments.length > 0 && (
          <Card className="p-0">
            <ul className="divide-y divide-zinc-200">
              {laterAppointments.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 p-[var(--space-4)]">
                  <p className="text-base font-medium break-words">
                    {a.starts_at ? new Date(a.starts_at).toLocaleString('en-GB') : 'No date'}
                  </p>
                  {a.provider_name && (
                    <p className="text-sm text-[color:var(--color-text-muted)] break-words">
                      Provider: {a.provider_name}
                    </p>
                  )}
                  {a.purpose && (
                    <p className="text-sm text-[color:var(--color-text-muted)] break-words">
                      Purpose: {a.purpose}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Block>

      <div className="grid gap-6 md:grid-cols-2">
        <Block id="refills-due" title="Refills due">
          {dueRefills.length === 0 ? (
            <EmptyState title="All clear" body="No refills due in the next 7 days." />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-zinc-200">
                {dueRefills.map((p) => {
                  const status = refillStatus(p.refill_date, today);
                  const overdue = status === 'overdue';
                  const days = p.refill_date ? daysBetween(today, p.refill_date) : 0;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 p-[var(--space-4)]">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-base font-medium break-words">{p.medication_name}</p>
                        <p className="text-sm text-[color:var(--color-text-muted)]">
                          {overdue ? 'Refill overdue' : `Refill due in ${days} days`}
                        </p>
                      </div>
                      {overdue ? (
                        <Badge tone="danger">Overdue</Badge>
                      ) : (
                        <Badge tone="warning">Due soon</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </Block>

        <Block id="open-tasks" title="Open tasks">
          {openTasks.length === 0 ? (
            <EmptyState title="No open tasks." body="Nothing is waiting. Tasks you add will appear here." />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-zinc-200">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 p-[var(--space-4)]">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-base font-medium break-words">{t.title}</p>
                      {t.due_date && (
                        <p className="text-sm text-[color:var(--color-text-muted)]">Due {t.due_date}</p>
                      )}
                    </div>
                    <Badge tone={STATUS_TONES[t.status] ?? 'neutral'}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </Block>
      </div>

      <Block id="recent-activity" title="Recent activity">
        {activity.length === 0 ? (
          <EmptyState title="No activity yet." body="Changes made by members will show here." />
        ) : (
          <Card>
            <ol className="relative flex flex-col gap-5 pl-6 before:absolute before:bottom-1 before:left-[6px] before:top-1 before:w-0.5 before:rounded-full before:bg-[color:var(--color-primary)] before:opacity-25">
              {activity.map((e) => (
                <li key={e.id} className="relative flex flex-col gap-1">
                  <span
                    aria-hidden="true"
                    className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-[color:var(--color-primary)] bg-white"
                  />
                  <p className="text-sm break-words">
                    {memberName(e.actor_id)} · {e.action} {e.entity_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-[color:var(--color-text-muted)]">{relativeTime(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </Block>
    </div>
  );
}
