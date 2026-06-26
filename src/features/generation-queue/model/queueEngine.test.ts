import { describe, it, expect, vi, afterEach } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import { ERROR_MESSAGES, MAX_CONCURRENT } from './constants'

/**
 * queueEngine импортирует useQueueStore (zustand + persist + localStorage),
 * который недоступен в node-окружении. Мокаем модуль, так как `tick` его не использует.
 */
vi.mock('./queueStore', () => ({
  useQueueStore: { getState: () => ({}) },
}))

const { tick } = await import('./queueEngine')

/** Минимальная фабрика задачи для тестов движка. */
function makeTask(overrides: Partial<GenerationTask> = {}): GenerationTask {
  return {
    id: 't1',
    type: 'image',
    prompt: 'prompt',
    model: 'model',
    status: 'queued',
    progress: 0,
    createdAt: 0,
    durationMs: 50000,
    credits: 80,
    ...overrides,
  }
}

const NOW = 2_000_000

afterEach(() => {
  vi.restoreAllMocks()
})

describe('tick', () => {
  it('passes non-running tasks through unchanged (same reference)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const done = makeTask({ id: 'd', status: 'done', progress: 100 })
    const result = tick([done], NOW)
    expect(result[0]).toBe(done)
  })

  it('(a) running task fails when rng < FAIL_RATE', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const task = makeTask({ id: 'r', status: 'running', progress: 10 })
    const [result] = tick([task], NOW)
    expect(result.status).toBe('failed')
    expect(result.error).toBe(ERROR_MESSAGES[0])
    expect(result.finishedAt).toBe(NOW)
  })

  it('(b) running task progresses when rng >= FAIL_RATE', () => {
    // base = 100 / (50000 / 500) = 1; jitter = 0.6 + 0.5*0.8 = 1.0 -> step = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const task = makeTask({ id: 'r', status: 'running', progress: 10 })
    const [result] = tick([task], NOW)
    expect(result.status).toBe('running')
    expect(result.progress).toBeCloseTo(11, 10)
  })

  it('(c) running task completes -> done at 100 when progress reaches the cap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const task = makeTask({ id: 'r', status: 'running', progress: 99.9 })
    const [result] = tick([task], NOW)
    expect(result.status).toBe('done')
    expect(result.progress).toBe(100)
    expect(result.finishedAt).toBe(NOW)
  })

  it('(d) promotes queued into free slots, FIFO by createdAt, up to MAX_CONCURRENT', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tasks = [
      makeTask({ id: 'late', status: 'queued', createdAt: 300 }),
      makeTask({ id: 'early', status: 'queued', createdAt: 100 }),
      makeTask({ id: 'mid', status: 'queued', createdAt: 200 }),
    ]
    const result = tick(tasks, NOW)
    const byId = Object.fromEntries(result.map((t) => [t.id, t]))
    expect(byId.early.status).toBe('running')
    expect(byId.mid.status).toBe('running')
    expect(byId.late.status).toBe('queued')
    expect(byId.early.startedAt).toBe(NOW)
    expect(result.filter((t) => t.status === 'running')).toHaveLength(MAX_CONCURRENT)
  })

  it('(e) does not promote queued when running slots are full', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tasks = [
      makeTask({ id: 'r1', status: 'running', progress: 10 }),
      makeTask({ id: 'r2', status: 'running', progress: 20 }),
      makeTask({ id: 'q1', status: 'queued', createdAt: 100 }),
    ]
    const result = tick(tasks, NOW)
    const byId = Object.fromEntries(result.map((t) => [t.id, t]))
    expect(byId.q1.status).toBe('queued')
    expect(result.filter((t) => t.status === 'running')).toHaveLength(MAX_CONCURRENT)
  })

  it('(f) promotes only the first (freeSlots) queued tasks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tasks = [
      makeTask({ id: 'r1', status: 'running', progress: 10 }),
      makeTask({ id: 'q_late', status: 'queued', createdAt: 200 }),
      makeTask({ id: 'q_early', status: 'queued', createdAt: 100 }),
    ]
    const result = tick(tasks, NOW)
    const byId = Object.fromEntries(result.map((t) => [t.id, t]))
    expect(byId.q_early.status).toBe('running')
    expect(byId.q_late.status).toBe('queued')
    expect(result.filter((t) => t.status === 'running')).toHaveLength(MAX_CONCURRENT)
  })
})
