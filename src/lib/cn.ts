import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const merge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'primary',
        'primary-light',
        'primary-bright',
        'primary-strong',
        'primary-soft',
        'primary-faint',
        'primary-foreground',
        'ink',
        'muted',
        'subtle',
        'surface',
        'surface-muted',
        'border',
        'page-warm',
        'page-blush',
        'success',
        'danger',
      ],
      radius: ['button', 'field', 'card', 'pill'],
      text: ['display', 'wordmark', 'label', 'body', 'caption'],
      shadow: ['card', 'cta'],
      spacing: ['touch'],
      ease: ['out-soft'],
    },
    classGroups: { 'bg-image': [{ bg: ['cta'] }] },
  },
});

/** Resolve semantic brand utilities consistently across console components. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
