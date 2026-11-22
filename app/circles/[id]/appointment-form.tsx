'use client';

import { useActionState, useEffect } from 'react';
import { addAppointment } from '../../actions/records';
import type { FormState } from '../../actions/auth';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { notifySaved } from '@/components/ui/feedback';

type RecipientOption = { id: string; full_name: string };

const initialState: FormState = { message: '' };

const labelClass = 'text-sm font-medium text-[color:var(--color-text)]';
const hintClass = 'text-sm text-[color:var(--color-text-muted)]';

export function AppointmentForm({
  circleId,
  recipients,
}: {
  circleId: string;
  recipients: RecipientOption[];
}) {
  const [state, formAction, pending] = useActionState(addAppointment, initialState);

  useEffect(() => {
    if (state.ok) notifySaved(state.message || 'Appointment added');
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circleId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="appt-recipient" className={labelClass}>
          Care recipient
        </label>
        <Select id="appt-recipient" name="recipientId" defaultValue={recipients[0]?.id} className="text-base">
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="appt-starts-at" className={labelClass}>
          Date and time
        </label>
        <Input
          id="appt-starts-at"
          name="startsAt"
          type="datetime-local"
          aria-describedby="appt-starts-at-hint"
          className="text-base"
        />
        <p id="appt-starts-at-hint" className={hintClass}>
          Pick a date and time
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="appt-provider" className={labelClass}>
          Provider
        </label>
        <Input id="appt-provider" name="providerName" type="text" className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="appt-location" className={labelClass}>
          Location or link
        </label>
        <Input id="appt-location" name="locationOrLink" type="text" className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="appt-purpose" className={labelClass}>
          Purpose
        </label>
        <Input id="appt-purpose" name="purpose" type="text" required className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="appt-notes" className={labelClass}>
          Notes
        </label>
        <Textarea id="appt-notes" name="notes" rows={3} className="text-base" />
      </div>

      <label
        htmlFor="appt-transport"
        className="flex min-h-[44px] items-center gap-3 text-base text-[color:var(--color-text)]"
      >
        <input
          id="appt-transport"
          name="transportArranged"
          type="checkbox"
          className="h-5 w-5 accent-[color:var(--color-primary)]"
        />
        Transport arranged
      </label>

      <Button type="submit" disabled={pending} className="min-h-[44px] w-full text-base sm:w-auto">
        Add appointment
      </Button>

      <p role="status" className={`text-base ${state.ok ? 'text-green-700' : 'text-red-700'}`}>
        {state.message}
      </p>
    </form>
  );
}
