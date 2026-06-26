import type { GenerationTask } from '@/entities/generation-task'
import { useQueueStore } from './queueStore'
import { applyTransition } from './transitions'
import { MAX_CONCURRENT, TICK_MS, FAIL_RATE, ERROR_MESSAGES } from './constants'

/** Случайный текст ошибки. */
function randomError(): string {
  return ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
}

/**
 * Шаг прогресса за тик: чем длиннее durationMs, тем меньше шаг.
 * К базовому шагу добавляется случайный разброс (0.6–1.4×), чтобы прогресс выглядел живым.
 */
function progressStep(task: GenerationTask): number {
  const ticksToComplete = Math.max(1, task.durationMs / TICK_MS)
  const base = 100 / ticksToComplete
  return base * (0.6 + Math.random() * 0.8)
}

/**
 * Один тик движка: продвигает running, завершает/роняет, добирает queued по слотам.
 * Чистая трансформация массива (не мутирует исходные элементы).
 */
export function tick(tasks: GenerationTask[], now: number): GenerationTask[] {
  let next = tasks.map((t) => {
    if (t.status !== 'running') return t
    if (Math.random() < FAIL_RATE) {
      return applyTransition(t, 'failed', now, { error: randomError() })
    }
    const progress = Math.min(100, t.progress + progressStep(t))
    if (progress >= 100) return applyTransition(t, 'done', now)
    return { ...t, progress }
  })

  const runningCount = next.filter((t) => t.status === 'running').length
  const freeSlots = MAX_CONCURRENT - runningCount
  if (freeSlots > 0) {
    const queued = next
      .filter((t) => t.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt)
    const promote = new Set(queued.slice(0, freeSlots).map((t) => t.id))
    next = next.map((t) => (promote.has(t.id) ? applyTransition(t, 'running', now) : t))
  }
  return next
}

/**
 * Создаёт движок очереди на одном интервале.
 * Тик выполняется только пока очередь готова (loadStatus === 'ready'):
 * при loading/error фоновая обработка задач не запускается.
 */
export function createEngine() {
  let timer: number | null = null
  return {
    start() {
      if (timer !== null) return
      timer = window.setInterval(() => {
        const state = useQueueStore.getState()
        if (state.loadStatus !== 'ready') return
        state.tickReplace(tick(state.tasks, Date.now()))
      }, TICK_MS)
    },
    stop() {
      if (timer !== null) {
        window.clearInterval(timer)
        timer = null
      }
    },
  }
}
