import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useQueue } from '@/features/generation-queue/model/useQueue'
import { Card, ModelPill, cn } from '@/shared'
import { ProgressBar } from './ProgressBar'
import { formatPercent } from '@/features/generation-queue/lib/formatEta'

/**
 * Глобальный плавающий индикатор генераций.
 * Скрыт при 0 активных; компактная карточка при 1; раскрытый виджет при ≥2.
 * Размещение: desktop/tablet — снизу-справа; mobile — полноширинная панель снизу.
 */
export function StatusBar() {
  const navigate = useNavigate()
  const { active, avgProgress } = useQueue()
  const count = active.length

  const containerCls =
    'fixed z-40 inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:p-0 sm:w-80'

  /**
   * Интерактивные ARIA-атрибуты применяются только в состоянии одной задачи,
   * где карточка не содержит вложенных интерактивных элементов.
   * При count ≥ 2 навигацию обеспечивает явная кнопка «Открыть очередь».
   */
  const cardA11y =
    count === 1
      ? {
          role: 'button' as const,
          tabIndex: 0,
          'aria-label': 'Открыть очередь генераций',
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate('/queue')
            }
          },
        }
      : {}

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="statusbar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className={containerCls}
        >
          <Card
            className="cursor-pointer p-4 shadow-xl transition hover:border-primary/50"
            onClick={() => navigate('/queue')}
            {...cardA11y}
          >
            {count === 1 ? (
              <div className="flex items-center gap-3">
                <Loader2
                  size={18}
                  className={cn('text-primary', active[0].status === 'running' && 'animate-spin')}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <ModelPill model={active[0].model} />
                  <ProgressBar value={active[0].progress} className="mt-2" />
                </div>
                <span className="font-mono text-xs">{formatPercent(active[0].progress)}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center">
                  <span className="text-sm font-medium">
                    Генерации идут · {count} активны · {formatPercent(avgProgress)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {active.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <ModelPill model={t.model} className="w-28 shrink-0 truncate" />
                      <ProgressBar value={t.progress} />
                    </div>
                  ))}
                </div>
                <button
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate('/queue')
                  }}
                >
                  Открыть очередь <ArrowRight size={14} />
                </button>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
