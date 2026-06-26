import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/** Карточка-контейнер дизайн-системы. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-card', className)} {...rest} />
}
