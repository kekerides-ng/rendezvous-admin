'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLogout, useMe } from './use-admin-auth';

/**
 * What a signed-in admin sees. Nearly empty on purpose — the queues get built
 * with the modules that feed them (build-plan 1.3 onward).
 *
 * It exists now so build-plan 1.1 is actually reachable: an endpoint you
 * cannot sign into from a browser is not finished.
 */
export function Dashboard() {
  const router = useRouter();
  const { data: me, isPending } = useMe();
  const logout = useLogout();

  useEffect(() => {
    // Redirect only once the answer is known — acting while pending bounces a
    // signed-in admin to /login on every refresh.
    if (!isPending && !me) router.replace('/login');
  }, [isPending, me, router]);

  if (isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-caption text-muted">Checking your session…</p>
      </main>
    );
  }

  if (!me) return null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-field bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-label text-ink">{me.email}</span>
            <span className="text-caption text-muted capitalize">{me.role}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          disabled={logout.isPending}
          onClick={() => {
            logout.mutate(undefined, { onSuccess: () => { router.replace('/login'); } });
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </header>

      <section className="rounded-card border border-border bg-surface p-6">
        <h1 className="text-display text-ink">You are signed in</h1>
        <p className="text-body text-muted pt-2">
          The console's queues — users, KYC, moderation, bookings, disputes — are built
          alongside the modules that feed them. Nothing to review yet.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 text-caption">
          <div>
            <dt className="text-muted">Signed in as</dt>
            <dd className="text-ink">{me.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Role</dt>
            <dd className="text-ink capitalize">{me.role}</dd>
          </div>
          <div>
            <dt className="text-muted">Last sign-in</dt>
            <dd className="text-ink">
              {me.lastLoginAt
                ? new Intl.DateTimeFormat('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Africa/Lagos',
                  }).format(new Date(me.lastLoginAt))
                : 'First time'}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
