import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared'

/** Состояние ошибки загрузки с кнопкой повтора. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border py-16 text-center">
      <AlertTriangle size={40} className="text-status-failed" aria-hidden />
      <p className="text-sm font-medium text-foreground">Не удалось загрузить очередь</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Повторить</Button>
    </div>
  )
}
