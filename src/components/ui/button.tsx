import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-cta text-primary-foreground shadow-cta hover:brightness-95',
  ghost: 'text-ink hover:bg-primary-faint',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-touch items-center justify-center gap-2 rounded-button px-5 py-3 text-label',
        'transition-[transform,box-shadow,background-color] duration-150 ease-out-soft active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
