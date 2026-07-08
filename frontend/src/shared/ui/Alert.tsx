import type { PropsWithChildren } from 'react';

const TONE_CLASSES = {
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-primary/30 bg-primary/10 text-primary',
} as const;

interface AlertProps extends PropsWithChildren {
  tone?: keyof typeof TONE_CLASSES;
}

export function Alert({ tone = 'danger', children }: AlertProps) {
  return (
    <div role="alert" className={`rounded-control border px-3.5 py-2.5 text-sm ${TONE_CLASSES[tone]}`}>
      {children}
    </div>
  );
}
