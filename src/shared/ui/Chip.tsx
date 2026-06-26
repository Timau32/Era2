import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

/** Чип-фильтр: активный — оранжевый filled, иначе outline. */
export function Chip({ active = false, className, children, ...rest }: ChipProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-pill px-3.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border text-muted-foreground hover:text-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
