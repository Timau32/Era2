import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

/** Координаты фиксированного меню относительно вьюпорта. */
interface MenuCoords {
  top: number
  right: number
}

/** Набор действий по статусу + меню «…» (минимум «Удалить»). */
export function TaskActions({ task, onCancel, onRetry, onDownload, onRemove }: TaskActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isActive = task.status === 'running' || task.status === 'queued'
  const isRetryable = task.status === 'failed' || task.status === 'canceled'

  /**
   * Переключает меню. При открытии вычисляет координаты от триггера,
   * чтобы зафиксировать его относительно вьюпорта (portal во body).
   */
  const toggleMenu = () => {
    setMenuOpen((open) => {
      if (open) return false
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) {
        setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
      }
      return true
    })
  }

  /** Закрывает меню. */
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      closeMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
    }
  }, [menuOpen])

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
      <span ref={triggerRef} className="relative inline-flex">
        <IconButton
          label="Ещё"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <MoreHorizontal size={16} />
        </IconButton>
      </span>
      {menuOpen &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              'min-w-32 rounded-xl border border-border bg-card p-1 shadow-lg',
            )}
            style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 50 }}
          >
            <button
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-status-failed hover:bg-secondary/50"
              onClick={() => {
                closeMenu()
                onRemove(task.id)
              }}
            >
              <Trash2 size={14} /> Удалить
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
