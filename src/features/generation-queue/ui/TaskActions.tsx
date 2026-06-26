import { useState } from 'react'
import { Download, MoreHorizontal, RotateCw, Trash2, X } from 'lucide-react'
import type { GenerationTask } from '@/entities/generation-task'
import { IconButton, cn } from '@/shared'

interface TaskActionsProps {
  task: GenerationTask
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onDownload: (id: string) => void
  onRemove: (id: string) => void
}

/** Набор действий по статусу + меню «…» (минимум «Удалить»). */
export function TaskActions({ task, onCancel, onRetry, onDownload, onRemove }: TaskActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isActive = task.status === 'running' || task.status === 'queued'
  const isRetryable = task.status === 'failed' || task.status === 'canceled'

  return (
    <div className="relative flex items-center gap-1.5">
      {isActive && (
        <IconButton label="Отменить" onClick={() => onCancel(task.id)}>
          <X size={16} />
        </IconButton>
      )}
      {isRetryable && (
        <IconButton label="Повторить" onClick={() => onRetry(task.id)}>
          <RotateCw size={16} />
        </IconButton>
      )}
      {task.status === 'done' && (
        <IconButton label="Скачать" onClick={() => onDownload(task.id)}>
          <Download size={16} />
        </IconButton>
      )}
      <IconButton label="Ещё" onClick={() => setMenuOpen((v) => !v)}>
        <MoreHorizontal size={16} />
      </IconButton>
      {menuOpen && (
        <div
          className={cn(
            'absolute right-0 top-9 z-10 min-w-32 rounded-xl border border-border bg-card p-1 shadow-lg',
          )}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-status-failed hover:bg-secondary/50"
            onClick={() => {
              setMenuOpen(false)
              onRemove(task.id)
            }}
          >
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      )}
    </div>
  )
}
