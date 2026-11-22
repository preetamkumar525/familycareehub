import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '../lib/supabase/server';
import { signOut } from './actions/auth';
import { CreateCircleForm } from './create-circle-form';

type Circle = { id: string; name: string };

type MembershipRow = {
  role: string;
  care_circles: Circle | Circle[] | null;
};

const FEATURES = [
  'Shared records and timeline',
  'Tasks with owners and status',
  'Restricted documents only for coordinators and caregivers',
];

const ROLE_TONE: Record<string, BadgeTone> = {
  coordinator: 'accent',
  caregiver: 'info',
  viewer: 'neutral',
};

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-[var(--color-text-muted)]">Loading...</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <Landing />;
  }

  const { data } = await supabase
    .from('care_circle_members')
    .select('role, care_circles(id, name)')
    .eq('user_id', user.id);

  const rows = (data ?? []) as MembershipRow[];
  const circles = rows.flatMap((row) => {
    const circle = Array.isArray(row.care_circles) ? row.care_circles[0] : row.care_circles;
    return circle ? [{ id: circle.id, name: circle.name, role: row.role }] : [];
  });

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--color-bg)] font-sans text-[var(--color-text)]">
      <Backdrop />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col items-start gap-4">
          <Badge tone="warning">SAMPLE DATA</Badge>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
            The Family Care Hub
          </h1>
          <p className="text-base leading-7 text-[var(--color-text-muted)] sm:text-lg sm:leading-8">
            This app records what clinicians ordered. It does not give medical advice. Questions
            about treatment go to the prescriber.
          </p>
        </div>

        <section aria-labelledby="circles-heading" className="flex flex-col gap-3">
          <h2 id="circles-heading" className="px-1 text-lg font-semibold text-[var(--color-text)]">
            Your care circles
          </h2>
          {circles.length === 0 ? (
            <EmptyState
              title="You are not in any care circle yet."
              body="Create one below to start sharing care with family."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {circles.map((circle) => (
                <li key={circle.id}>
                  <Card tilt className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/circles/${circle.id}`}
                        className="min-w-0 break-words text-lg font-semibold text-[var(--color-text)] underline-offset-4 hover:text-[color:var(--color-primary-ink)] hover:underline"
                      >
                        {circle.name}
                      </Link>
                      <Badge tone={ROLE_TONE[circle.role] ?? 'neutral'} className="shrink-0">
                        {roleLabel(circle.role)}
                      </Badge>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card className="flex flex-col gap-3 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Create care circle</h2>
          <CreateCircleForm />
        </Card>

        <form action={signOut} className="flex">
          <Button type="submit" variant="secondary" className="w-full sm:w-auto">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}

function Landing() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--color-bg)] font-sans text-[var(--color-text)]">
      <Backdrop />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 md:grid-cols-2 md:gap-10 md:py-20 lg:px-10">
        <div className="flex min-w-0 flex-col items-start gap-6">
          <Badge tone="warning">SAMPLE DATA</Badge>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.1] tracking-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl">
            One shared place for a family&apos;s care.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-[var(--color-text-muted)]">
            Keep appointments, prescriptions, reports and tasks together, and see who is doing what,
            from any city.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-[var(--color-on-primary)] shadow-[0_10px_24px_-8px_rgba(15,94,99,0.55)] transition hover:bg-[var(--color-primary-hover)]"
            >
              Sign up
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-base font-semibold text-[var(--color-text)] shadow-sm transition hover:bg-[var(--color-bg)]"
            >
              Sign in
            </Link>
          </div>

          <p className="max-w-xl rounded-xl border-l-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
            This app records what clinicians ordered. It does not give medical advice. Questions
            about treatment go to the prescriber.
          </p>

          <ul className="flex flex-col gap-3 text-base text-[var(--color-text)]">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className="mt-1 h-5 w-5 shrink-0 text-[var(--color-primary-ink)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <HeroStage />
      </div>
    </main>
  );
}

function HeroStage() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[340px] w-full md:h-[440px]"
      style={{ perspective: '900px' }}
    >
      <span
        className="float absolute h-12 w-12 rounded-full bg-[var(--color-accent)]/35 shadow-lg"
        style={{ top: '0%', left: '2%' }}
      />
      <span
        className="float absolute h-8 w-8 rounded-full bg-[var(--color-secondary)]/30"
        style={{ top: '84%', left: '44%', animationDelay: '-3s' }}
      />
      <span
        className="float absolute h-10 w-10 rounded-full bg-[var(--color-primary)]/30"
        style={{ top: '28%', left: '76%', animationDelay: '-5s' }}
      />

      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        <Card
          tilt={false}
          className="glass absolute w-[170px] p-3 shadow-[0_18px_40px_-12px_rgba(15,94,99,0.35)] md:w-[230px] md:p-4"
          style={{ top: '4%', left: '0%', transform: 'translateZ(40px)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary-ink)]">
            Appointment
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text)] md:text-base">Tue 12 Mar · 09:30</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Clinic visit</p>
        </Card>

        <Card
          tilt={false}
          className="glass absolute w-[170px] p-3 shadow-[0_18px_40px_-12px_rgba(15,94,99,0.35)] md:w-[230px] md:p-4"
          style={{ top: '38%', left: '30%', transform: 'translateZ(100px)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary-ink)]">
            Prescription
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text)] md:text-base">Refill due</p>
        </Card>

        <Card
          tilt={false}
          className="glass absolute w-[170px] p-3 shadow-[0_18px_40px_-12px_rgba(15,94,99,0.35)] md:w-[230px] md:p-4"
          style={{ top: '66%', left: '8%', transform: 'translateZ(60px)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary-ink)]">
            Task
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text)] md:text-base">Book transport</p>
          <div className="mt-2">
            <Badge tone="info">In progress</Badge>
          </div>
        </Card>

        <Card
          tilt={false}
          className="glass absolute flex items-center gap-2 p-3 shadow-[0_18px_40px_-12px_rgba(15,94,99,0.35)] md:p-4"
          style={{ top: '2%', left: '46%', transform: 'translateZ(160px)' }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-[var(--color-secondary-ink)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p className="text-xs font-semibold text-[var(--color-text)] md:text-sm">Restricted report</p>
        </Card>
      </div>
    </div>
  );
}

function Backdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-surface)] to-[var(--color-bg)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 -z-10 h-[360px] w-[360px] rounded-full bg-[var(--color-secondary)]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 -z-10 h-[320px] w-[320px] rounded-full bg-[var(--color-primary)]/15 blur-3xl"
      />
    </>
  );
}
