import type { QueueCounts } from '@/features/generation-queue/model/selectors'
import { Card } from '@/shared'

const ITEMS: { key: keyof QueueCounts; label: string; dot: string }[] = [
  { key: 'queued', label: 'В очереди', dot: 'bg-status-queued' },
  { key: 'running', label: 'Идёт', dot: 'bg-status-running' },
  { key: 'done', label: 'Готово', dot: 'bg-status-done' },
  { key: 'failed', label: 'Ошибка', dot: 'bg-status-failed' },
]

/** Сводка из 4 реактивных счётчиков (mobile — 2×2). */
export function QueueStats({ counts }: { counts: QueueCounts }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map((it) => (
        <Card key={it.key} className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${it.dot}`} aria-hidden />
            {it.label}
          </div>
          <p className="mt-2 font-mono text-2xl text-foreground">{counts[it.key]}</p>
        </Card>
      ))}
    </div>
  )
}
