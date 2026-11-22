'use client';

import { useActionState, useEffect } from 'react';
import { setTaskStatus } from '../../actions/tasks';
import type { FormState } from '../../actions/auth';
import { notifySaved } from '@/components/ui/feedback';

const initialState: FormState = { message: '' };

const segmentClass =
  'press flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--radius-md)] px-[var(--space-2)] text-base font-semibold text-[color:var(--color-primary-ink)] transition-colors duration-150 hover:bg-[color:var(--color-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] disabled:pointer-events-none disabled:opacity-50';

export function TaskStatusForm({ taskId, circleId }: { taskId: string; circleId: string }) {
  const [state, formAction, pending] = useActionState(setTaskStatus, initialState);

  useEffect(() => {
    if (state.ok) {
      notifySaved();
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="circleId" value={circleId} />

      <div
        role="group"
        aria-label="Set task status"
        className="flex gap-[var(--space-1)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-[var(--space-1)]"
      >
        <button
          type="submit"
          name="status"
          value="in_progress"
          disabled={pending}
          aria-label="Mark as in progress"
          className={segmentClass}
        >
          In progress
        </button>
        <button
          type="submit"
          name="status"
          value="done"
          disabled={pending}
          aria-label="Mark as done"
          className={segmentClass}
        >
          Done
        </button>
        <button
          type="submit"
          name="status"
          value="blocked"
          disabled={pending}
          aria-label="Mark as blocked"
          className={segmentClass}
        >
          Blocked
        </button>
      </div>

      <p
        role="status"
        className={`text-sm ${state.ok ? 'text-[color:var(--tone-success-fg)]' : 'text-[color:var(--tone-danger-fg)]'}`}
      >
        {state.message}
      </p>
    </form>
  );
}
