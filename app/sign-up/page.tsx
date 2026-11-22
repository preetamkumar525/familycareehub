'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signUp } from '../actions/auth';
import type { FormState } from '../actions/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const initialState: FormState = { message: '' };

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 font-sans text-[color:var(--color-text)]">
      <Card className="flex w-full max-w-[420px] flex-col gap-6 p-6 sm:p-8">
        <Badge tone="warning" className="w-fit">SAMPLE DATA</Badge>
        <p className="text-base leading-7 text-[color:var(--color-text-muted)]">This app records what clinicians ordered. It does not give medical advice. Questions about treatment go to the prescriber.</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">Create account</h1>

        <form action={formAction} className="flex flex-col gap-4">
          <label htmlFor="sign-up-name" className="flex flex-col gap-1.5 text-base text-[color:var(--color-text-muted)]">
            Name
            <Input
              id="sign-up-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="text-base"
            />
          </label>

          <label htmlFor="sign-up-email" className="flex flex-col gap-1.5 text-base text-[color:var(--color-text-muted)]">
            Email
            <Input
              id="sign-up-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="text-base"
            />
          </label>

          <label htmlFor="sign-up-password" className="flex flex-col gap-1.5 text-base text-[color:var(--color-text-muted)]">
            Password
            <Input
              id="sign-up-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="text-base"
            />
          </label>

          <Button type="submit" disabled={pending} className="w-full">
            Create account
          </Button>
        </form>

        {state.message && (
          <p
            role="status"
            className={`text-base ${state.ok ? 'text-[color:var(--tone-success-fg)]' : 'text-[color:var(--tone-danger-fg)]'}`}
          >
            {state.message}
          </p>
        )}

        <Link href="/sign-in" className="text-base font-medium text-[color:var(--color-primary-ink)] underline underline-offset-4">
          Already have an account? Sign in
        </Link>
      </Card>
    </main>
  );
}
