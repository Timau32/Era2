import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { GenerationTask } from '@/entities/generation-task'
import { useMediaQuery } from '@/shared'
import { selectQueuePosition } from '@/features/generation-queue/model/selectors'
import { TaskRow, type RowActions } from './TaskRow'
import { TaskCard } from './TaskCard'

interface TaskListProps {
  /** Отфильтрованные/отсортированные видимые задачи. */
  tasks: GenerationTask[]
  /** Полный список — для расчёта позиции в очереди. */
  allTasks: GenerationTask[]
  actions: RowActions
}

/** Виртуализированный список задач (row на desktop/tablet, card на mobile). */
export function TaskList({ tasks, allTasks, actions }: TaskListProps) {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? 168 : 80),
    overscan: 8,
    getItemKey: (i) => tasks[i].id,
  })

  return (
    <div ref={parentRef} className="max-h-[calc(100vh-320px)] overflow-y-auto [scrollbar-width:thin]">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        <AnimatePresence initial={false}>
          {virtualizer.getVirtualItems().map((vi) => {
            const task = tasks[vi.index]
            const position = selectQueuePosition(allTasks, task.id)
            return (
              <motion.div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                className="pb-3"
              >
                {isMobile ? (
                  <TaskCard task={task} position={position} actions={actions} />
                ) : (
                  <TaskRow task={task} position={position} actions={actions} />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
