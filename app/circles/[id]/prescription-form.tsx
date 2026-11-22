'use client';

import { useActionState, useEffect } from 'react';
import { addPrescription } from '../../actions/records';
import type { FormState } from '../../actions/auth';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { notifySaved } from '@/components/ui/feedback';

type RecipientOption = { id: string; full_name: string };

const initialState: FormState = { message: '' };

const labelClass = 'text-sm font-medium text-[color:var(--color-text)]';
const hintClass = 'text-sm text-[color:var(--color-text-muted)]';

export function PrescriptionForm({
  circleId,
  recipients,
}: {
  circleId: string;
  recipients: RecipientOption[];
}) {
  const [state, formAction, pending] = useActionState(addPrescription, initialState);

  useEffect(() => {
    if (state.ok) notifySaved(state.message || 'Prescription added');
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circleId} />

      <p className={hintClass}>Enter dose and schedule exactly as the prescriber wrote them.</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rx-recipient" className={labelClass}>
          Care recipient
        </label>
        <Select id="rx-recipient" name="recipientId" defaultValue={recipients[0]?.id} className="text-base">
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rx-medication" className={labelClass}>
          Medication name
        </label>
        <Input id="rx-medication" name="medicationName" type="text" required className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rx-dose" className={labelClass}>
          Dose, as written
        </label>
        <Input id="rx-dose" name="doseText" type="text" className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rx-schedule" className={labelClass}>
          Schedule, as written
        </label>
        <Textarea id="rx-schedule" name="scheduleText" rows={2} className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rx-pharmacy" className={labelClass}>
          Pharmacy
        </label>
        <Input id="rx-pharmacy" name="pharmacyName" type="text" className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rx-prescriber" className={labelClass}>
          Prescriber
        </label>
        <Input id="rx-prescriber" name="prescriberName" type="text" className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rx-refill" className={labelClass}>
          Refill date
        </label>
        <Input
          id="rx-refill"
          name="refillDate"
          type="date"
          aria-describedby="rx-refill-hint"
          className="text-base"
        />
        <p id="rx-refill-hint" className={hintClass}>
          Pick a date
        </p>
      </div>

      <Button type="submit" disabled={pending} className="min-h-[44px] w-full text-base sm:w-auto">
        Add prescription
      </Button>

      <p role="status" className={`text-base ${state.ok ? 'text-green-700' : 'text-red-700'}`}>
        {state.message}
      </p>
    </form>
  );
}
