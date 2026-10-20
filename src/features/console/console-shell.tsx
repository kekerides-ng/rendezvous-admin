'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col md:flex-row">
      <aside className="flex gap-6 border-b border-border bg-surface p-6 md:w-60 md:flex-col md:border-r md:border-b-0">
        <Link href="/" className="text-label">
          Rendezvous Admin
        </Link>
        <nav aria-label="Console" className="flex gap-4 md:flex-col">
          <Link
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            className="text-primary"
          >
            Dashboard
          </Link>
          <Link
            href="/users"
            aria-current={pathname === '/users' ? 'page' : undefined}
            className="text-primary"
          >
            Users
          </Link>
        </nav>
        <div className="ml-auto flex flex-col gap-2 md:mt-auto md:ml-0">
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
            Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
