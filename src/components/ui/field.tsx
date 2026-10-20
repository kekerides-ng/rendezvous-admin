'use client';

import { useId } from 'react';

import { cn } from '@/lib/cn';

/** A labelled input with its error wired to `aria-describedby`. */
export function Field({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null }) {
  const id = useId();
  const messageId = `${id}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className={cn(
          'min-h-touch rounded-field border bg-surface px-3 text-base text-ink outline-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      />
      {error ? (
        <p id={messageId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
