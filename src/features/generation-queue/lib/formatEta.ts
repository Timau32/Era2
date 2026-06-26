import type { GenerationTask } from '@/entities/generation-task'

/** «2 мин» / «45 сек» из миллисекунд. */
export function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec} сек`
  const min = Math.round(sec / 60)
  return `${min} мин`
}

/** «80 кр» из числа кредитов. */
export function formatCredits(n: number): string {
  return `${n} кр`
}

/** «64%». */
export function formatPercent(n: number): string {
  return `${Math.round(n)}%`
}

/** Короткая мета-строка времени по статусу. */
export function formatEta(task: GenerationTask): string {
  if (task.status === 'done' && task.etaMs) return `готово за ${formatDuration(task.etaMs)}`
  if (task.status === 'running' && task.etaMs) return `~${formatDuration(task.etaMs)}`
  if (task.etaMs) return formatDuration(task.etaMs)
  return formatDuration(task.durationMs)
}
