'use client';

import { useActionState, useEffect } from 'react';
import { addReport } from '../../actions/records';
import type { FormState } from '../../actions/auth';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { notifySaved } from '@/components/ui/feedback';

type RecipientOption = { id: string; full_name: string };

const initialState: FormState = { message: '' };

const labelClass = 'text-sm font-medium text-[color:var(--color-text)]';
const hintClass = 'text-sm text-[color:var(--color-text-muted)]';

export function ReportForm({
  circleId,
  recipients,
  canSetRestricted,
}: {
  circleId: string;
  recipients: RecipientOption[];
  canSetRestricted: boolean;
}) {
  const [state, formAction, pending] = useActionState(addReport, initialState);

  useEffect(() => {
    if (state.ok) notifySaved(state.message || 'Report uploaded');
  }, [state]);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circleId} />

      <p className={hintClass}>PDF or image, up to 10 MB.</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-recipient" className={labelClass}>
          Care recipient
        </label>
        <Select id="report-recipient" name="recipientId" defaultValue={recipients[0]?.id} className="text-base">
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-title" className={labelClass}>
          Title
        </label>
        <Input id="report-title" name="title" type="text" required className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-date" className={labelClass}>
          Report date
        </label>
        <Input
          id="report-date"
          name="reportDate"
          type="date"
          aria-describedby="report-date-hint"
          className="text-base"
        />
        <p id="report-date-hint" className={hintClass}>
          Pick a date
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-source" className={labelClass}>
          Source
        </label>
        <Input id="report-source" name="source" type="text" className="text-base" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-visibility" className={labelClass}>
          Restricted: coordinators and caregivers only
        </label>
        <Select id="report-visibility" name="visibility" defaultValue="standard" className="text-base">
          <option value="standard">Standard</option>
          {canSetRestricted && <option value="restricted">Restricted</option>}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-file" className={labelClass}>
          File
        </label>
        <Input
          id="report-file"
          name="file"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          required
          className="text-base file:mr-3 file:rounded-[var(--radius-md)] file:border-0 file:bg-[color:var(--color-border)] file:px-3 file:py-2 file:font-medium file:text-[color:var(--color-text)]"
        />
      </div>

      <Button type="submit" disabled={pending} className="min-h-[44px] w-full text-base sm:w-auto">
        Upload report
      </Button>

      <p role="status" className={`text-base ${state.ok ? 'text-green-700' : 'text-red-700'}`}>
        {state.message}
      </p>
    </form>
  );
}
