interface SkeletonProps {
  className?: string;
}

/** Placeholder de carga: dimensiona con className (ej. "h-4 w-32"). */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-surface-raised ${className}`} />;
}
