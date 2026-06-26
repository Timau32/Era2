import type { GenerationTask } from '@/entities/generation-task'
import type { SortOrder, StatusFilter, TypeFilter } from './queueStore'

export interface QueueCounts {
  queued: number
  running: number
  done: number
  failed: number
}

/** Реактивные счётчики по статусам. */
export function selectCounts(tasks: GenerationTask[]): QueueCounts {
  return {
    queued: tasks.filter((t) => t.status === 'queued').length,
    running: tasks.filter((t) => t.status === 'running').length,
    done: tasks.filter((t) => t.status === 'done').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }
}

/** Фильтр по статусу/типу → поиск по промпту → сортировка. */
export function selectVisibleTasks(input: {
  tasks: GenerationTask[]
  statusFilter: StatusFilter
  typeFilter: TypeFilter
  search: string
  sort: SortOrder
}): GenerationTask[] {
  const { tasks, statusFilter, typeFilter, search, sort } = input
  const q = search.trim().toLowerCase()
  const filtered = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (q && !t.prompt.toLowerCase().includes(q)) return false
    return true
  })
  const dir = sort === 'newest' ? -1 : 1
  return [...filtered].sort((a, b) => (a.createdAt - b.createdAt) * dir)
}

/** Активные задачи (running + queued) для статус-бара. */
export function selectActiveTasks(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.filter((t) => t.status === 'running' || t.status === 'queued')
}

/** Усреднённый прогресс активных задач (queued считаем как 0). */
export function selectAverageProgress(tasks: GenerationTask[]): number {
  const active = selectActiveTasks(tasks)
  if (active.length === 0) return 0
  const sum = active.reduce((acc, t) => acc + (t.status === 'running' ? t.progress : 0), 0)
  return sum / active.length
}

/** Позиция queued-задачи в очереди (1-based) или null. */
export function selectQueuePosition(tasks: GenerationTask[], id: string): number | null {
  const queued = tasks
    .filter((t) => t.status === 'queued')
    .sort((a, b) => a.createdAt - b.createdAt)
  const idx = queued.findIndex((t) => t.id === id)
  return idx === -1 ? null : idx + 1
}
