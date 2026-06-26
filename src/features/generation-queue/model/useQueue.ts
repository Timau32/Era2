import { useMemo } from 'react'
import { useQueueStore } from './queueStore'
import {
  selectCounts,
  selectVisibleTasks,
  selectActiveTasks,
  selectAverageProgress,
} from './selectors'

/** Публичный хук фичи: реактивное состояние очереди + действия. */
export function useQueue() {
  const tasks = useQueueStore((s) => s.tasks)
  const loadStatus = useQueueStore((s) => s.loadStatus)
  const statusFilter = useQueueStore((s) => s.statusFilter)
  const typeFilter = useQueueStore((s) => s.typeFilter)
  const sort = useQueueStore((s) => s.sort)
  const search = useQueueStore((s) => s.search)

  const counts = useMemo(() => selectCounts(tasks), [tasks])
  const visibleTasks = useMemo(
    () => selectVisibleTasks({ tasks, statusFilter, typeFilter, search, sort }),
    [tasks, statusFilter, typeFilter, search, sort],
  )
  const active = useMemo(() => selectActiveTasks(tasks), [tasks])
  const avgProgress = useMemo(() => selectAverageProgress(tasks), [tasks])

  return {
    tasks,
    visibleTasks,
    counts,
    active,
    avgProgress,
    loadStatus,
    filters: { statusFilter, typeFilter, sort, search },
    actions: {
      cancel: useQueueStore((s) => s.cancel),
      retry: useQueueStore((s) => s.retry),
      remove: useQueueStore((s) => s.remove),
      clearDone: useQueueStore((s) => s.clearDone),
      readd: useQueueStore((s) => s.readd),
      initLoad: useQueueStore((s) => s.initLoad),
      setStatusFilter: useQueueStore((s) => s.setStatusFilter),
      setTypeFilter: useQueueStore((s) => s.setTypeFilter),
      setSort: useQueueStore((s) => s.setSort),
      setSearch: useQueueStore((s) => s.setSearch),
    },
  }
}
