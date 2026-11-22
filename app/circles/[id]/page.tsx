import { Suspense, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { InviteForm } from './invite-form';
import { RoleForm } from './role-form';
import { RecordsSection } from './records-section';
import { Dashboard } from './dashboard';
import { TasksSection } from './tasks-section';
import { AddSheet } from '@/components/ui/sheet';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import {
  IconArrowLeft,
  IconFile,
  IconHome,
  IconPrinter,
  IconTask,
  IconUsers,
  type IconProps,
} from '@/components/ui/icons';

type Member = {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
};

type Role = 'coordinator' | 'caregiver' | 'viewer';
type TabValue = 'overview' | 'records' | 'tasks' | 'members';
type SearchParams = { tab?: string | string[] };

const TABS: { value: TabValue; label: string; Icon: ComponentType<IconProps> }[] = [
  { value: 'overview', label: 'Overview', Icon: IconHome },
  { value: 'records', label: 'Records', Icon: IconFile },
  { value: 'tasks', label: 'Tasks', Icon: IconTask },
  { value: 'members', label: 'Members', Icon: IconUsers },
];

const ROLE_TONE: Record<Role, BadgeTone> = {
  coordinator: 'accent',
  caregiver: 'info',
  viewer: 'neutral',
};

// Unknown or missing tab values fall back to overview.
function resolveTab(raw: string | string[] | undefined): TabValue {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return TABS.find((tab) => tab.value === value)?.value ?? 'overview';
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <CircleContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CircleContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const tab = resolveTab(query.tab);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const { data: circle } = await supabase.from('care_circles').select('name').eq('id', id).single();

  const { data: mine } = await supabase
    .from('care_circle_members')
    .select('role')
    .eq('circle_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const myRole: string | null = mine?.role ?? null;

  if (!myRole) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-white p-6 font-sans">
        <p className="text-base text-zinc-700">You are not a member of this circle.</p>
        <Link href="/" className="text-base text-zinc-700 underline">
          Back
        </Link>
      </main>
    );
  }

  const { data: memberData } = await supabase.rpc('list_circle_members', { p_circle: id });
  const members = (memberData ?? []) as Member[];
  const isCoordinator = myRole === 'coordinator';
  const role = myRole as Role;
  const roleTone = ROLE_TONE[role] ?? 'neutral';

  let content: ReactNode;

  if (tab === 'overview') {
    content = (
      <div className="flex min-w-0 flex-col gap-6">
        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-black">Care recipient</h2>
          <p className="text-sm text-zinc-600">Recipient details are on the Records tab.</p>
        </Card>
        <Dashboard circleId={id} role={role} />
      </div>
    );
  } else if (tab === 'records') {
    content = <RecordsSection circleId={id} role={role} />;
  } else if (tab === 'tasks') {
    content = <TasksSection circleId={id} role={role} members={members} />;
  } else {
    content = (
      <section aria-labelledby="members-heading" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="members-heading" className="text-lg font-semibold text-black">
            Members
          </h2>
          {isCoordinator && (
            <AddSheet triggerLabel="Invite member" title="Invite a member">
              <InviteForm circleId={id} />
            </AddSheet>
          )}
        </div>
        {members.length === 0 ? (
          <p className="text-base text-zinc-600">No members yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {members.map((member) => {
              // Email is shown to coordinators only; non-coordinators never see it, even as a name fallback.
              const label =
                member.display_name || (isCoordinator ? member.email : null) || 'Unnamed member';
              return (
                <li key={member.user_id} className="min-w-0">
                  <Card className="flex flex-col gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={member.display_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-black">{label}</p>
                        {isCoordinator && member.email && (
                          <p className="truncate text-sm text-zinc-600">{member.email}</p>
                        )}
                      </div>
                      <Badge tone={ROLE_TONE[member.role as Role] ?? 'neutral'} className="shrink-0 capitalize">
                        {member.role}
                      </Badge>
                    </div>
                    {isCoordinator && member.user_id !== user.id && (
                      <RoleForm
                        key={`${member.user_id}-${member.role}`}
                        circleId={id}
                        userId={member.user_id}
                        currentRole={member.role}
                      />
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  const tabClass = (active: boolean) =>
    [
      'flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-full)] px-4 text-sm font-semibold transition-colors',
      active
        ? 'bg-[color:var(--color-surface)] text-[color:var(--color-primary-ink)] shadow-[var(--shadow-soft)]'
        : 'text-zinc-700 hover:text-black',
    ].join(' ');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col pb-24 font-sans md:pb-10">
      <header className="glass sticky top-0 z-30 border-b border-[color:var(--color-border)] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] px-2 text-sm font-semibold text-[color:var(--color-primary-ink)]"
            >
              <IconArrowLeft />
              Back
            </Link>
            <Link
              href={`/circles/${id}/handoff`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] bg-[color:var(--color-surface)] px-4 text-sm font-semibold text-[color:var(--color-primary-ink)] shadow-[var(--shadow-soft)]"
            >
              <IconPrinter />
              Printable handoff summary
            </Link>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-xl font-semibold tracking-tight text-black sm:text-2xl">
              {circle?.name ?? 'Care circle'}
            </h1>
            <Badge tone={roleTone} className="capitalize">
              {myRole}
            </Badge>
            <Badge tone="warning">SAMPLE DATA</Badge>
          </div>
        </div>
      </header>

      <div className="flex min-w-0 flex-col gap-6 px-4 pt-4 sm:px-6">
        <p className="text-sm leading-6 text-zinc-600">
          This app records what clinicians ordered. It does not give medical advice. Questions about treatment go to the
          prescriber.
        </p>

        <nav aria-label="Circle sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max min-w-full gap-1 rounded-[var(--radius-full)] bg-[color:var(--color-border)] p-1 sm:w-full">
            {TABS.map(({ value, label, Icon }) => {
              const active = tab === value;
              return (
                <li key={value} className="flex flex-1">
                  <Link
                    href={`/circles/${id}?tab=${value}`}
                    aria-current={active ? 'page' : undefined}
                    className={`${tabClass(active)} w-full`}
                  >
                    <Icon />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">{content}</div>
      </div>

      <nav
        aria-label="Circle sections navigation"
        className="glass fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--color-border)] md:hidden"
      >
        <ul className="mx-auto flex max-w-3xl justify-around px-2 py-1">
          {TABS.map(({ value, label, Icon }) => {
            const active = tab === value;
            return (
              <li key={value} className="flex flex-1">
                <Link
                  href={`/circles/${id}?tab=${value}`}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex min-h-[44px] w-full min-w-[44px] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-xs font-semibold',
                    active ? 'text-[color:var(--color-primary-ink)]' : 'text-zinc-600',
                  ].join(' ')}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Toaster />
    </main>
  );
}
