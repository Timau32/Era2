import { cn } from '@/shared/lib/cn'

/** Пилюля модели: оранжевая точка + название в моно-шрифте. */
export function ModelPill({ model, className }: { model: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      {model}
    </span>
  )
}
