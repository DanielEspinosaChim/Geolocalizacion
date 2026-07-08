import type { PropsWithChildren } from 'react';

const TONE_CLASSES = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-primary/30 bg-primary/10 text-primary',
  neutral: 'border-border bg-surface-raised text-fg-muted',
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
  className?: string;
}

/** Estados semánticos: formal=success, en_proceso=warning, informal=danger. */
export function Badge({ tone = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-px text-[10px] font-bold ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
