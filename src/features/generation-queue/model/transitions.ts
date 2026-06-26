import type { GenerationTask, TaskStatus } from '@/entities/generation-task'

/** Разрешённые переходы конечного автомата. */
const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  queued: ['running', 'canceled'],
  running: ['done', 'failed', 'canceled'],
  done: [],
  failed: ['queued'],
  canceled: ['queued'],
}

/** Проверяет допустимость перехода статуса. */
export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED[from].includes(to)
}

/**
 * Применяет переход статуса, возвращая НОВЫЙ объект задачи.
 * Сбрасывает/выставляет производные поля (progress, startedAt, finishedAt, error).
 * При недопустимом переходе возвращает исходную задачу без изменений.
 */
export function applyTransition(
  task: GenerationTask,
  to: TaskStatus,
  now: number,
  patch: Partial<GenerationTask> = {},
): GenerationTask {
  if (!canTransition(task.status, to)) return task
  const base: GenerationTask = { ...task, status: to, ...patch }
  switch (to) {
    case 'running':
      return { ...base, startedAt: now, error: undefined }
    case 'done':
      return { ...base, progress: 100, finishedAt: now }
    case 'failed':
      return { ...base, finishedAt: now }
    case 'canceled':
      return { ...base, finishedAt: now }
    case 'queued':
      return { ...base, progress: 0, startedAt: undefined, finishedAt: undefined, error: undefined }
    default:
      return base
  }
}
