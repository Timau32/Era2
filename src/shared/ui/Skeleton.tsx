import { cn } from '@/shared/lib/cn'

/** Плейсхолдер-скелетон для состояния загрузки. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-secondary/60', className)} />
}
