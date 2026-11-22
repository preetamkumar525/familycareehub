'use client';

import { useActionState } from 'react';
import { createCircle } from './actions/circles';
import type { FormState } from './actions/auth';

const initialState: FormState = { message: '' };

export function CreateCircleForm() {
  const [state, formAction, pending] = useActionState(createCircle, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="create-circle-name" className="flex flex-col gap-1 text-base text-zinc-700">
        Circle name
        <input
          id="create-circle-name"
          name="name"
          type="text"
          required
          maxLength={80}
          className="w-full rounded border border-zinc-300 p-3 text-base"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-black p-3 text-base font-medium text-white disabled:opacity-50"
      >
        Create care circle
      </button>

      {state.message && <p className="text-base text-red-700">{state.message}</p>}
    </form>
  );
}
