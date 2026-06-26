import { Trash2 } from 'lucide-react'
import {
  useQueue,
  QueueStats,
  QueueToolbar,
  TaskList,
  EmptyState,
  LoadingState,
  ErrorState,
  type RowActions,
} from '@/features/generation-queue'
import { Button, showToast } from '@/shared'

/** Композиция экрана очереди: шапка + сводка + тулбар + список/состояния. */
export function GenerationQueue() {
  const { tasks, visibleTasks, counts, loadStatus, filters, actions } = useQueue()

  const rowActions: RowActions = {
    onCancel: actions.cancel,
    onRetry: actions.retry,
    onDownload: () => showToast({ message: 'Скачивание (заглушка) начато' }),
    onRemove: (id) => {
      const removed = tasks.find((t) => t.id === id)
      actions.remove(id)
      showToast({
        message: 'Задача удалена',
        actionLabel: 'Отменить',
        onAction: () => {
          if (removed) actions.readd([removed])
        },
      })
    },
  }

  const onClearDone = () => {
    if (counts.done === 0) return
    const cleared = tasks.filter((t) => t.status === 'done')
    actions.clearDone()
    showToast({
      message: `Удалено готовых: ${cleared.length}`,
      actionLabel: 'Отменить',
      onAction: () => actions.readd(cleared),
    })
  }

  const renderBody = () => {
    if (loadStatus === 'loading' || loadStatus === 'idle') return <LoadingState />
    if (loadStatus === 'error') return <ErrorState onRetry={() => actions.initLoad(Date.now())} />
    if (tasks.length === 0) return <EmptyState variant="empty" />
    if (visibleTasks.length === 0) return <EmptyState variant="no-results" />
    return <TaskList tasks={visibleTasks} allTasks={tasks} actions={rowActions} />
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Очередь генераций</h1>
          <p className="text-sm text-muted-foreground">Все ваши задачи в реальном времени</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClearDone} disabled={counts.done === 0}>
          <Trash2 size={14} /> Очистить готовые
        </Button>
      </header>

      <QueueStats counts={counts} />

      <QueueToolbar
        statusFilter={filters.statusFilter}
        sort={filters.sort}
        onStatus={actions.setStatusFilter}
        onSort={actions.setSort}
        onSearch={actions.setSearch}
      />

      {renderBody()}
    </div>
  )
}
