import type { TaskStatus } from '@/entities/generation-task'
import { Badge } from '@/shared'

const CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  queued: { label: 'В очереди', className: 'bg-secondary text-status-queued' },
  running: { label: 'Идёт', className: 'bg-primary/15 text-status-running' },
  done: { label: 'Готово', className: 'bg-status-done/15 text-status-done' },
  failed: { label: 'Ошибка', className: 'bg-destructive/15 text-status-failed' },
  canceled: { label: 'Отменено', className: 'bg-secondary/60 text-status-canceled' },
}

/** Цветной статусный бейдж. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = CONFIG[status]
  return <Badge className={className}>{label}</Badge>
}
