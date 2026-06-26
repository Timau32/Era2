import type { GenerationTask } from '@/entities/generation-task'
import { ModelPill } from '@/shared'
import { formatCredits, formatEta } from '@/features/generation-queue/lib/formatEta'

/** Строка меты: model-pill + ETA/кредиты/позиция или текст ошибки. */
export function TaskMeta({ task, position }: { task: GenerationTask; position?: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <ModelPill model={task.model} />
      {task.status === 'failed' && task.error ? (
        <span className="text-status-failed">{task.error}</span>
      ) : task.status === 'canceled' ? (
        <span>{task.error ?? 'Отменено пользователем'}</span>
      ) : task.status === 'queued' && position ? (
        <span>· позиция {position} в очереди · {formatCredits(task.credits)}</span>
      ) : (
        <span>· {formatEta(task)} · {formatCredits(task.credits)}</span>
      )}
    </div>
  )
}
