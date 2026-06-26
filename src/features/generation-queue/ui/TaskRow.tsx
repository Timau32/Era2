import type { GenerationTask } from '@/entities/generation-task'
import { Card } from '@/shared'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { TaskTypeIcon } from './TaskTypeIcon'
import { TaskMeta } from './TaskMeta'
import { TaskActions } from './TaskActions'
import { formatPercent } from '@/features/generation-queue/lib/formatEta'

export interface RowActions {
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onDownload: (id: string) => void
  onRemove: (id: string) => void
}

/** Строка задачи для desktop/tablet. */
export function TaskRow({ task, position, actions }: { task: GenerationTask; position: number | null; actions: RowActions }) {
  return (
    <Card className="flex items-center gap-4 px-4 py-3">
      <TaskTypeIcon type={task.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{task.prompt}</p>
        <TaskMeta task={task} position={position} />
        {task.status === 'running' && <ProgressBar value={task.progress} className="mt-2" />}
      </div>
      {task.status === 'running' && (
        <span className="w-12 text-right font-mono text-sm text-foreground">{formatPercent(task.progress)}</span>
      )}
      <StatusBadge status={task.status} />
      <TaskActions task={task} {...actions} />
    </Card>
  )
}
