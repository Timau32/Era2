import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface BadgeProps {
  className?: string
  children: ReactNode
}

/** Пилюля-бейдж (цвет задаёт потребитель через className). */
export function Badge({ className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium', className)}>
      {children}
    </span>
  )
}
