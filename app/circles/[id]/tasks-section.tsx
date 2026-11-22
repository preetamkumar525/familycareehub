import { createClient } from '../../../lib/supabase/server';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { AddSheet } from '@/components/ui/sheet';
import { TaskForm } from './task-form';
import { TaskStatusForm } from './task-status-form';

type Role = 'coordinator' | 'caregiver' | 'viewer';

type Member = { user_id: string; display_name?: string | null };

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  owner_id: string | null;
  completed_at: string | null;
  recipient_id: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
};

const STATUS_TONES: Record<string, BadgeTone> = {
  todo: 'neutral',
  in_progress: 'info',
  done: 'success',
  blocked: 'danger',
};

export async function TasksSection({
  circleId,
  role,
  members,
}: {
  circleId: string;
  role: Role;
  members: Member[];
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tasks')
    .select('id, title, due_date, status, owner_id, completed_at, recipient_id')
    .eq('circle_id', circleId)
    .order('due_date', { nullsFirst: false });

  const tasks = (data ?? []) as Task[];
  const canWrite = role === 'coordinator' || role === 'caregiver';

  // Display name of the owner, or null when unassigned (or the owner is not a member).
  const ownerName = (ownerId: string | null) => {
    if (!ownerId) {
      return null;
    }
    return members.find((m) => m.user_id === ownerId)?.display_name || null;
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Tasks</h2>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet."
          body="Add a task and assign an owner so everyone knows who is doing what."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((t) => {
            const owner = ownerName(t.owner_id);
            return (
              <li key={t.id}>
                <Card className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-base font-medium text-[color:var(--color-text)]">
                      {t.title}
                    </p>
                    <Badge tone={STATUS_TONES[t.status] ?? 'neutral'}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-[color:var(--color-text-muted)]">
                    {t.due_date ? `Due ${t.due_date}` : 'No due date'}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                    <Avatar name={owner} />
                    <span>{owner ?? 'Unassigned'}</span>
                  </div>

                  {canWrite && t.status !== 'done' && <TaskStatusForm taskId={t.id} circleId={circleId} />}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {canWrite && (
        <div>
          <AddSheet triggerLabel="+ Add task" title="Add a task">
            <TaskForm circleId={circleId} members={members} />
          </AddSheet>
        </div>
      )}
    </section>
  );
}
