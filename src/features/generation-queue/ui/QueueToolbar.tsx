import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { StatusFilter, SortOrder } from '@/features/generation-queue/model/queueStore'
import { Chip, Input, cn, useDebouncedValue } from '@/shared'

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'queued', label: 'В очереди' },
  { value: 'running', label: 'Идёт' },
  { value: 'done', label: 'Готово' },
  { value: 'failed', label: 'Ошибка' },
]

interface ToolbarProps {
  statusFilter: StatusFilter
  sort: SortOrder
  onStatus: (v: StatusFilter) => void
  onSort: (v: SortOrder) => void
  onSearch: (v: string) => void
}

/** Тулбар: чипы-фильтры + сортировка + поиск (debounce). */
export function QueueToolbar({ statusFilter, sort, onStatus, onSort, onSearch }: ToolbarProps) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 300)
  useEffect(() => onSearch(debounced), [debounced, onSearch])

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {STATUS_CHIPS.map((c) => (
          <Chip key={c.value} active={statusFilter === c.value} onClick={() => onStatus(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по промпту…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortOrder)}
          className={cn('h-9 rounded-pill border border-border bg-input px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
        >
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
        </select>
      </div>
    </div>
  )
}
