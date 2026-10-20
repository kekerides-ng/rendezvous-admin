'use client';

import Link from 'next/link';
import { ArrowUpRight, UsersRound } from 'lucide-react';

import { useMe } from './use-admin-auth';

export function Dashboard() {
  const { data: me } = useMe();
  if (!me) return null;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-start gap-3">
        <span className="rounded-pill bg-primary-faint px-3 py-1 text-caption text-primary">
          Rendezvous team
        </span>
        <h1 className="text-display">Your workspace.</h1>
        <p className="max-w-lg text-body text-muted">
          A little care goes a long way. Manage community access and keep Rendezvous welcoming.
        </p>
      </header>
      <section className="rounded-card border border-border bg-surface p-6 shadow-card md:p-8">
        <div className="mb-6 flex size-12 items-center justify-center rounded-field bg-primary-faint text-primary">
          <UsersRound className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-wordmark">People, first.</h2>
        <p className="mt-2 max-w-lg text-body text-muted">
          Find an account, review its access, and record the reason whenever you make a change.
        </p>
        <Link
          href="/users"
          className="mt-6 inline-flex min-h-touch items-center gap-2 rounded-button bg-cta px-5 py-3 text-label text-primary-foreground shadow-cta hover:brightness-95"
        >
          Manage users <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
      <p className="text-caption text-muted">
        KYC, moderation, bookings and disputes will appear here as their modules are built.
      </p>
    </div>
  );
}
