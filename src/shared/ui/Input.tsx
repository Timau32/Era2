import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/** Текстовый инпут дизайн-системы (rounded). */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 rounded-pill border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...rest}
    />
  )
}
