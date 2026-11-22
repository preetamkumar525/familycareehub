'use client';

import { useActionState } from 'react';
import { inviteMember } from '../../actions/circles';
import type { FormState } from '../../actions/auth';

const initialState: FormState = { message: '' };

export function InviteForm({ circleId }: { circleId: string }) {
  const [state, formAction, pending] = useActionState(inviteMember, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="circleId" value={circleId} />

      <label htmlFor="invite-email" className="flex flex-col gap-1 text-base text-zinc-700">
        Email
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-zinc-300 p-3 text-base"
        />
      </label>

      <label htmlFor="invite-role" className="flex flex-col gap-1 text-base text-zinc-700">
        Role
        <select
          id="invite-role"
          name="role"
          defaultValue="caregiver"
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
        className="w-full rounded bg-black p-3 text-base font-medium text-white disabled:opacity-50"
      >
        Invite member
      </button>

      {state.message && (
        <p className={`text-base ${state.ok ? 'text-green-700' : 'text-red-700'}`}>{state.message}</p>
      )}
    </form>
  );
}
