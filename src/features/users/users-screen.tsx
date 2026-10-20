'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useMe } from '@/features/auth/use-admin-auth';
import {
  revealPhone,
  useChangeSuspension,
  useUsers,
  type UserItem,
  type UsersQuery,
} from './use-users';

const dateFormat = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Lagos',
});
function date(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : '—';
}

function Phone({ user }: { user: UserItem }) {
  const [phone, setPhone] = useState<string | null>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reveal = useMutation({
    mutationFn: async () => {
      const value = await revealPhone(user.id);
      if (mounted.current) setPhone(value);
      // Return no PII: even the mutation cache must not retain the phone.
    },
  });

  return (
    <div className="flex flex-col items-start gap-1">
      <span>{phone === undefined ? (user.maskedPhone ?? 'No phone') : (phone ?? 'No phone')}</span>
      {user.maskedPhone ? (
        <Button
          variant="ghost"
          disabled={reveal.isPending}
          onClick={() => {
            if (phone !== undefined) setPhone(undefined);
            else reveal.mutate();
          }}
        >
          {reveal.isPending ? 'Revealing…' : phone === undefined ? 'Reveal phone' : 'Hide phone'}
        </Button>
      ) : null}
      {reveal.error ? (
        <p role="alert" className="text-caption text-danger">
          {reveal.error.message}
        </p>
      ) : null}
    </div>
  );
}

function Confirmation({
  user,
  onClose,
  onSuccess,
}: {
  user: UserItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const [reason, setReason] = useState('');
  const mutation = useChangeSuspension();
  const suspend = user.disabledAt === null;
  const action = suspend ? 'Suspend' : 'Reinstate';
  return (
    <section
      aria-labelledby="confirmation-title"
      className="mb-6 rounded-card border border-border bg-surface p-6"
    >
      <h2 id="confirmation-title" ref={heading} tabIndex={-1} className="text-label">
        {action} user {user.id}?
      </h2>
      <p className="my-3 text-body text-muted">
        {suspend
          ? 'This immediately ends their sessions and prevents sign-in.'
          : 'They will need to sign in again. Previous sessions stay revoked.'}{' '}
        Your reason is recorded in the audit log.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!reason.trim() || mutation.isPending) return;
          mutation.mutate({ id: user.id, suspend, reason: reason.trim() }, { onSuccess });
        }}
      >
        <Field
          label="Reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
          }}
          required
          maxLength={1000}
          disabled={mutation.isPending}
        />
        {mutation.error ? (
          <p role="alert" className="mt-3 text-danger">
            {mutation.error.message}
          </p>
        ) : null}
        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={!reason.trim() || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : `Confirm ${action.toLowerCase()}`}
          </Button>
          <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

export function UsersScreen() {
  const { data: me } = useMe();
  const [query, setQuery] = useState<UsersQuery>({
    page: 1,
    pageSize: 25,
    status: 'all',
    sort: 'createdAt',
    direction: 'desc',
  });
  const users = useUsers(query);
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [notice, setNotice] = useState('');

  function sort(column: UsersQuery['sort']) {
    setQuery({
      ...query,
      page: 1,
      sort: column,
      direction: query.sort === column && query.direction === 'desc' ? 'asc' : 'desc',
    });
  }

  return (
    <>
      <h1 className="text-display">Users</h1>
      <p className="mt-2 mb-6 text-body text-muted">
        Manage access to Rendezvous. Times are shown in Africa/Lagos.
      </p>
      {notice ? (
        <p role="status" className="mb-4 text-label text-success">
          {notice}
        </p>
      ) : null}
      {selected && me?.role === 'admin' ? (
        <Confirmation
          key={selected.id}
          user={selected}
          onClose={() => {
            setSelected(null);
          }}
          onSuccess={() => {
            setSelected(null);
            setNotice('User access updated.');
          }}
        />
      ) : null}
      <div className="mb-4 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-label">
          Status
          <select
            className="min-h-touch rounded-field border border-border bg-surface px-3"
            value={query.status}
            onChange={(event) => {
              const status = event.target.value;
              if (status === 'all' || status === 'active' || status === 'suspended')
                setQuery({ ...query, status, page: 1 });
            }}
          >
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-label">
          Rows per page
          <select
            className="min-h-touch rounded-field border border-border bg-surface px-3"
            value={query.pageSize}
            onChange={(event) => {
              setQuery({ ...query, pageSize: Number(event.target.value), page: 1 });
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <Button
          variant="ghost"
          disabled={users.isFetching}
          onClick={() => {
            void users.refetch();
          }}
        >
          Refresh
        </Button>
      </div>
      {users.isPending ? (
        <p role="status">Loading users…</p>
      ) : users.error ? (
        <div role="alert">
          <p>{users.error.message}</p>
          <Button
            onClick={() => {
              void users.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : users.data.items.length === 0 ? (
        <p role="status" className="rounded-card border border-border bg-surface p-6">
          No users match this page and filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-caption">
            <caption className="sr-only">
              Rendezvous users. Phone numbers are masked until revealed.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-3">
                  User ID
                </th>
                <th scope="col" className="p-3">
                  Phone
                </th>
                <th scope="col" className="p-3">
                  KYC
                </th>
                <th scope="col" className="p-3">
                  Status
                </th>
                {(['createdAt', 'lastLoginAt'] as const).map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="p-3"
                    aria-sort={
                      query.sort === column
                        ? query.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <Button
                      variant="ghost"
                      onClick={() => {
                        sort(column);
                      }}
                    >
                      {column === 'createdAt' ? 'Created' : 'Last sign-in'}{' '}
                      {query.sort === column ? (query.direction === 'asc' ? '↑' : '↓') : ''}
                    </Button>
                  </th>
                ))}
                {me?.role === 'admin' ? (
                  <th scope="col" className="p-3">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody key={JSON.stringify(query)}>
              {users.data.items.map((user) => (
                <tr key={user.id} className="border-b border-border align-top">
                  <th scope="row" className="max-w-48 break-all p-3 font-normal">
                    {user.id}
                  </th>
                  <td className="p-3">
                    <Phone user={user} />
                  </td>
                  <td className="p-3">{user.kycVerified ? 'Verified' : 'Not verified'}</td>
                  <td className="p-3">
                    {user.disabledAt ? (
                      <>
                        Suspended
                        <br />
                        <span className="text-muted">{date(user.disabledAt)}</span>
                      </>
                    ) : (
                      'Active'
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">{date(user.createdAt)}</td>
                  <td className="p-3 whitespace-nowrap">{date(user.lastLoginAt)}</td>
                  {me?.role === 'admin' ? (
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setNotice('');
                          setSelected(user);
                        }}
                      >
                        {user.disabledAt ? 'Reinstate' : 'Suspend'}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Users pagination" className="mt-4 flex items-center gap-3">
        <Button
          variant="ghost"
          disabled={query.page === 1 || users.isFetching}
          onClick={() => {
            setQuery({ ...query, page: query.page - 1 });
          }}
        >
          Previous
        </Button>
        <span className="text-caption">
          Page {query.page}
          {users.data ? ` · ${users.data.total} users` : ''}
        </span>
        <Button
          variant="ghost"
          disabled={
            !users.data || query.page * query.pageSize >= users.data.total || users.isFetching
          }
          onClick={() => {
            setQuery({ ...query, page: query.page + 1 });
          }}
        >
          Next
        </Button>
      </nav>
    </>
  );
}
