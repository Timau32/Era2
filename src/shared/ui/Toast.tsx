import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from '@/shared/model/toastStore'
import { Button } from '@/shared/ui/Button'

/** Контейнер тостов (Undo-уведомления). */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-auto flex items-center gap-3 rounded-pill border border-border bg-card px-4 py-2 text-sm shadow-lg"
          >
            <span>{t.message}</span>
            {t.actionLabel && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  t.onAction?.()
                  dismiss(t.id)
                }}
              >
                {t.actionLabel}
              </Button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
