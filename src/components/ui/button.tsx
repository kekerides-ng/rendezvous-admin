import { cn } from '@/lib/cn';

export function Button({
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-touch items-center justify-center gap-2 rounded-field px-4 text-label',
        'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary-strong'
          : 'text-ink hover:bg-surface-muted',
        className,
      )}
      {...props}
    />
  );
}
