'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, UsersRound, LogOut, ShieldCheck } from 'lucide-react';

import { Brand } from '@/components/ui/brand';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { useLogout, useMe } from '@/features/auth/use-admin-auth';

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isPending, error, refetch } = useMe();
  const logout = useLogout();

  useEffect(() => {
    if (me === null) router.replace('/login');
  }, [me, router]);

  if (isPending)
    return (
      <main className="p-10" role="status">
        Checking your session…
      </main>
    );
  if (error)
    return (
      <main className="p-10">
        <p role="alert">{error.message}</p>
        <Button
          onClick={() => {
            void refetch();
          }}
        >
          Retry
        </Button>
      </main>
    );
  if (!me) return null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col gap-6 px-4 md:flex-row md:px-6">
      <aside className="mt-4 flex flex-col gap-8 rounded-card border border-border bg-surface/95 p-6 shadow-card md:sticky md:top-6 md:my-6 md:h-[calc(100dvh-3rem)] md:w-64 md:shrink-0">
        <Link href="/" aria-label="Rendezvous Admin dashboard">
          <Brand />
        </Link>
        <nav aria-label="Console" className="flex flex-col gap-2">
          <p className="mb-2 px-4 text-caption text-muted">Workspace</p>
          <Link
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            className={cn(
              'flex min-h-touch items-center gap-3 rounded-button px-4 py-3 text-label transition-colors',
              pathname === '/'
                ? 'bg-primary-faint text-primary'
                : 'text-muted hover:bg-surface-muted hover:text-ink',
            )}
          >
            <LayoutDashboard className="size-5" aria-hidden="true" /> Dashboard
          </Link>
          <Link
            href="/users"
            aria-current={pathname === '/users' ? 'page' : undefined}
            className={cn(
              'flex min-h-touch items-center gap-3 rounded-button px-4 py-3 text-label transition-colors',
              pathname === '/users'
                ? 'bg-primary-faint text-primary'
                : 'text-muted hover:bg-surface-muted hover:text-ink',
            )}
          >
            <UsersRound className="size-5" aria-hidden="true" /> Users
          </Link>
          <Link
            href="/kyc"
            aria-current={pathname === '/kyc' ? 'page' : undefined}
            className={cn(
              'flex min-h-touch items-center gap-3 rounded-button px-4 py-3 text-label transition-colors',
              pathname === '/kyc'
                ? 'bg-primary-faint text-primary'
                : 'text-muted hover:bg-surface-muted hover:text-ink',
            )}
          >
            <ShieldCheck className="size-5" aria-hidden="true" /> ID review
          </Link>
        </nav>
        <div className="flex flex-col gap-3 border-t border-border pt-6 md:mt-auto">
          <p className="break-all text-caption text-muted">
            {me.email} · {me.role}
          </p>
          {logout.error ? (
            <p role="alert" className="text-caption text-danger">
              {logout.error.message}
            </p>
          ) : null}
          <Button
            variant="ghost"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate(undefined, {
                onSuccess: () => {
                  router.replace('/login');
                },
              });
            }}
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-2 py-6 md:px-4 md:py-12">{children}</main>
    </div>
  );
}
