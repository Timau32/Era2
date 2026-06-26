import type { GenerationTask } from '@/entities/generation-task'
import { Card } from '@/shared'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { TaskTypeIcon } from './TaskTypeIcon'
import { TaskMeta } from './TaskMeta'
import { TaskActions } from './TaskActions'
import type { RowActions } from './TaskRow'
import { formatPercent } from '@/features/generation-queue/lib/formatEta'

/** Карточка задачи для mobile. */
export function TaskCard({ task, position, actions }: { task: GenerationTask; position: number | null; actions: RowActions }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <TaskTypeIcon type={task.type} />
        <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{task.prompt}</p>
        <StatusBadge status={task.status} />
      </div>
      <TaskMeta task={task} position={position} />
      {task.status === 'running' && (
        <div className="flex items-center gap-3">
          <ProgressBar value={task.progress} />
          <span className="w-10 shrink-0 text-right font-mono text-sm">{formatPercent(task.progress)}</span>
        </div>
      )}
      <div className="flex justify-end">
        <TaskActions task={task} {...actions} />
      </div>
    </Card>
  )
}
