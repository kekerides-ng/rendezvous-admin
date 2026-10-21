'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useMediaQueue, useReviewMedia } from './use-media';

const date = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Lagos',
});

export function MediaScreen() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; action: 'approve' | 'reject' } | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const queue = useMediaQueue(page);
  const review = useReviewMedia();
  const canSubmit = reason.trim().length >= 10;

  const select = (id: string, action: 'approve' | 'reject') => {
    setSelected({ id, action });
    setReason('');
    review.reset();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-caption text-primary">Trust & safety</p>
        <h1 className="text-display text-ink">Photo review</h1>
        <p className="text-body text-muted">
          Approve clear profile photos before they appear in discovery.
        </p>
      </div>
      {queue.isPending ? <p role="status">Loading photos…</p> : null}
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
          aria-label="Photo review queue"
        >
          <p className="text-label text-ink">{queue.data.total} awaiting review</p>
          {queue.data.items.length === 0 ? (
            <p className="mt-4 text-body text-muted">No photos need review right now.</p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {queue.data.items.map((item) => (
                <article key={item.id} className="rounded-field border border-border p-4">
                  {item.url ? (
                    <div className="mb-3 aspect-3/4 max-h-96 overflow-hidden rounded-photo bg-surface-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private S3 URL */}
                      <img
                        src={item.url}
                        alt="Profile photo awaiting review"
                        className="size-full object-contain"
                      />
                    </div>
                  ) : null}
                  <p className="text-label text-ink">User {item.userId}</p>
                  <p className="text-caption text-muted">
                    Submitted {date.format(new Date(item.createdAt))}
                  </p>
                  {selected?.id === item.id ? (
                    <form
                      className="mt-3 flex flex-col gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!canSubmit) return;
                        review.mutate(
                          { ...selected, reason: reason.trim() },
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
                        label={
                          selected.action === 'approve'
                            ? 'Reason for approval'
                            : 'Reason for rejection'
                        }
                        value={reason}
                        onChange={(event) => {
                          setReason(event.target.value);
                        }}
                        minLength={10}
                        required
                      />
                      {review.error ? (
                        <p role="alert" className="text-danger">
                          {review.error.message}
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          variant={selected.action === 'reject' ? 'danger' : undefined}
                          disabled={!canSubmit || review.isPending}
                        >
                          Confirm {selected.action}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
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
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => {
                          select(item.id, 'approve');
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          select(item.id, 'reject');
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="mt-5 flex items-center gap-3">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={() => {
                setPage(page - 1);
              }}
            >
              Previous
            </Button>
            <span className="text-caption text-muted">Page {page}</span>
            <Button
              variant="ghost"
              disabled={page * queue.data.pageSize >= queue.data.total}
              onClick={() => {
                setPage(page + 1);
              }}
            >
              Next
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
