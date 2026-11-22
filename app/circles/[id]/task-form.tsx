'use client';

import { useActionState, useEffect } from 'react';
import { createTask } from '../../actions/tasks';
import type { FormState } from '../../actions/auth';
import { Button } from '@/components/ui/button';
import { notifySaved } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/input';

type MemberOption = { user_id: string; display_name?: string | null };

const initialState: FormState = { message: '' };

export function TaskForm({ circleId, members }: { circleId: string; members: MemberOption[] }) {
  const [state, formAction, pending] = useActionState(createTask, initialState);

  useEffect(() => {
    if (state.ok) {
      notifySaved();
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circleId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="text-sm font-medium text-[color:var(--color-text)]">
          Title
        </label>
        <Input
          id="task-title"
          name="title"
          type="text"
          required
          maxLength={120}
          className="min-h-[44px] text-base"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-due-date" className="text-sm font-medium text-[color:var(--color-text)]">
          Due date
        </label>
        <Input id="task-due-date" name="dueDate" type="date" className="min-h-[44px] text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-owner" className="text-sm font-medium text-[color:var(--color-text)]">
          Owner
        </label>
        <Select id="task-owner" name="ownerId" defaultValue="" className="min-h-[44px] text-base">
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.display_name || 'Member'}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" disabled={pending} className="w-full min-h-[44px] text-base">
        Add task
      </Button>

      <p
        role="status"
        className={`text-base ${state.ok ? 'text-[color:var(--tone-success-fg)]' : 'text-[color:var(--tone-danger-fg)]'}`}
      >
        {state.message}
      </p>
    </form>
  );
}
