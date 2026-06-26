import { Inbox, SearchX } from 'lucide-react'

/** Пустое состояние: нет задач или нет результатов под фильтром. */
export function EmptyState({ variant }: { variant: 'empty' | 'no-results' }) {
  const isEmpty = variant === 'empty'
  const Icon = isEmpty ? Inbox : SearchX
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon size={40} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">
        {isEmpty ? 'Очередь пуста' : 'Ничего не найдено'}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {isEmpty ? 'Новые задачи генерации появятся здесь.' : 'Измените фильтры или поисковый запрос.'}
      </p>
    </div>
  )
}
