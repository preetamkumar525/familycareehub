'use client';

import { useActionState, useEffect } from 'react';
import { addRecipient } from '../../actions/records';
import type { FormState } from '../../actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notifySaved } from '@/components/ui/feedback';

const initialState: FormState = { message: '' };

const labelClass = 'text-sm font-medium text-[color:var(--color-text)]';
const hintClass = 'text-sm text-[color:var(--color-text-muted)]';

export function RecipientForm({ circleId }: { circleId: string }) {
  const [state, formAction, pending] = useActionState(addRecipient, initialState);

  useEffect(() => {
    if (state.ok) notifySaved(state.message || 'Care recipient added');
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circleId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="recipient-full-name" className={labelClass}>
          Full name
        </label>
        <Input id="recipient-full-name" name="fullName" type="text" required className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="recipient-dob" className={labelClass}>
          Date of birth
        </label>
        <Input
          id="recipient-dob"
          name="dateOfBirth"
          type="date"
          aria-describedby="recipient-dob-hint"
          className="text-base"
        />
        <p id="recipient-dob-hint" className={hintClass}>
          Pick a date
        </p>
      </div>

      <Button type="submit" disabled={pending} className="min-h-[44px] w-full text-base sm:w-auto">
        Add care recipient
      </Button>

      <p role="status" className={`text-base ${state.ok ? 'text-green-700' : 'text-red-700'}`}>
        {state.message}
      </p>
    </form>
  );
}
