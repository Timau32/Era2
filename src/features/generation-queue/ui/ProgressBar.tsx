import { motion } from 'framer-motion'
import { cn } from '@/shared'

/** Тонкий прогресс-бар (оранжевый), плавно растёт. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-pill bg-secondary', className)}>
      <motion.div
        className="h-full rounded-pill bg-primary"
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ ease: 'linear', duration: 0.4 }}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
