import Link from 'next/link';
import { Card } from '../../components/ui/card';

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[800px] flex-col gap-6 p-4 font-sans sm:p-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-4xl">
          About this demo
        </h1>
        <span className="w-fit rounded-[var(--radius-sm)] bg-[color:var(--tone-warning-bg)] px-2 py-1 text-sm font-semibold text-[color:var(--tone-warning-fg)]">
          SAMPLE DATA
        </span>
      </header>

      <Card className="flex flex-col gap-4">
        <p className="text-base leading-7 text-[color:var(--color-text-muted)] sm:text-lg sm:leading-8">
          All data in this app is sample data. The names, dates, medications and providers are invented for
          demonstration. Do not enter real patient records.
        </p>
        <p className="text-base leading-7 text-[color:var(--color-text-muted)] sm:text-lg sm:leading-8">
          This app organises information only. It does not give medical advice, diagnose conditions, or recommend
          doses or treatments. Clinical decisions stay with doctors and other licensed clinicians.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-base leading-7 text-[color:var(--color-text-muted)] sm:text-lg sm:leading-8">
          Refill dates are shown by date only. Dose and schedule text is shown exactly as entered.
        </p>
        <p className="text-base leading-7 text-[color:var(--color-text-muted)] sm:text-lg sm:leading-8">
          Restricted documents are visible only to coordinators and caregivers.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-base leading-7 text-[color:var(--color-text-muted)] sm:text-lg sm:leading-8">
          This is a prototype. It is not certified for HIPAA, GDPR health data, or any clinical use.
        </p>
        <p className="text-base leading-7 text-[color:var(--color-text-muted)] sm:text-lg sm:leading-8">
          This app records what clinicians ordered. It does not give medical advice. Questions about treatment go to
          the prescriber.
        </p>
      </Card>

      <Link
        href="/"
        className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-secondary)] px-[var(--space-4)] py-[var(--space-2)] text-base font-semibold text-[color:var(--color-on-primary)] shadow-[var(--shadow-soft)] hover:brightness-110"
      >
        Back to home
      </Link>
    </main>
  );
}
