'use client';

import Link from 'next/link';

import { useMe } from './use-admin-auth';

export function Dashboard() {
  const { data: me } = useMe();
  if (!me) return null;
  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <h1 className="text-display">Dashboard</h1>
      <p className="pt-2 text-body text-muted">Signed in as {me.email}.</p>
      <Link href="/users" className="mt-6 inline-block text-label text-primary">
        Manage users →
      </Link>
      <p className="pt-4 text-caption text-muted">
        KYC, moderation, bookings and disputes will appear as their modules are built.
      </p>
    </section>
  );
}
