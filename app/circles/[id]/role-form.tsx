'use client';

import { useActionState } from 'react';
import { changeRole } from '../../actions/circles';
import type { FormState } from '../../actions/auth';

const initialState: FormState = { message: '' };

export function RoleForm({
  circleId,
  userId,
  currentRole,
}: {
  circleId: string;
  userId: string;
  currentRole: string;
}) {
  const [state, formAction, pending] = useActionState(changeRole, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="circleId" value={circleId} />
      <input type="hidden" name="userId" value={userId} />

      <label className="flex flex-col gap-1 text-base text-zinc-700">
        Role
        <select
          name="role"
          defaultValue={currentRole}
          className="w-full rounded border border-zinc-300 p-3 text-base"
        >
          <option value="coordinator">Coordinator</option>
          <option value="caregiver">Caregiver</option>
          <option value="viewer">Viewer</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded border border-zinc-300 p-3 text-base font-medium text-black disabled:opacity-50"
      >
        Save role
      </button>

      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-green-700' : 'text-red-700'}`}>{state.message}</p>
      )}
    </form>
  );
}
