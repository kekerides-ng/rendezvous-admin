'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useKycQueue, useRejectKyc } from './use-kyc';

const date = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Lagos',
});

export function KycScreen() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const queue = useKycQueue(page);
  const reject = useRejectKyc();
  const canReject = reason.trim().length >= 10;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-caption text-primary">Trust & safety</p>
        <h1 className="text-display text-ink">ID review</h1>
        <p className="text-body text-muted">
          Reviews contain status and result codes. Identity documents stay with the verification
          provider.
        </p>
      </div>
      {queue.isPending ? <p role="status">Loading reviews…</p> : null}
      {queue.error ? (
        <div role="alert" className="flex items-center gap-3">
          <span>{queue.error.message}</span>
          <Button
            onClick={() => {
              void queue.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {queue.data ? (
        <section
          className="rounded-card border border-border bg-surface p-5 shadow-card"
          aria-label="Review queue"
        >
          <p className="text-label text-ink">{queue.data.total} awaiting review</p>
          {queue.data.items.length === 0 ? (
            <p className="mt-4 text-body text-muted">No ID checks need review right now.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {queue.data.items.map((item) => (
                <div key={item.id} className="rounded-field border border-border p-4">
                  <p className="text-label text-ink">User {item.userId}</p>
                  <p className="text-caption text-muted">
                    {date.format(new Date(item.createdAt))} · Provider result{' '}
                    {item.resultCode ?? 'pending'} · {item.reason ?? 'No reason supplied'}
                  </p>
                  <p className="text-caption text-muted">
                    Age evidence: {item.adult ? 'adult' : 'unproven'} · Provider approval:{' '}
                    {item.providerApproved ? 'yes' : 'no'}
                  </p>
                  {selected === item.id ? (
                    <form
                      className="mt-3 flex flex-col gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!canReject) return;
                        reject.mutate(
                          { id: item.id, reason: reason.trim() },
                          {
                            onSuccess: () => {
                              setSelected(null);
                              setReason('');
                            },
                          },
                        );
                      }}
                    >
                      <Field
                        label="Reason for rejection"
                        value={reason}
                        onChange={(event) => { setReason(event.target.value); }}
                        minLength={10}
                        required
                      />
                      {reject.error ? (
                        <p role="alert" className="text-danger">
                          {reject.error.message}
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          type="submit"
                          disabled={!canReject || reject.isPending}
                        >
                          Confirm rejection
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            setSelected(null);
                            setReason('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelected(item.id);
                        setReason('');
                        reject.reset();
                      }}
                    >
                      Reject review
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex items-center gap-3">
            <Button variant="ghost" disabled={page <= 1} onClick={() => { setPage(page - 1); }}>
              Previous
            </Button>
            <span className="text-caption text-muted">Page {page}</span>
            <Button
              variant="ghost"
              disabled={page * queue.data.pageSize >= queue.data.total}
              onClick={() => { setPage(page + 1); }}
            >
              Next
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
