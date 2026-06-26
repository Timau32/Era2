import { describe, it, expect } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import { formatDuration, formatCredits, formatPercent, formatEta } from './formatEta'

/** Минимальная фабрика задачи для тестов форматтеров. */
function makeTask(overrides: Partial<GenerationTask> = {}): GenerationTask {
  return {
    id: 't1',
    type: 'image',
    prompt: 'prompt',
    model: 'model',
    status: 'queued',
    progress: 0,
    createdAt: 0,
    durationMs: 14000,
    credits: 80,
    ...overrides,
  }
}

describe('formatDuration', () => {
  it('renders seconds below the one-minute boundary', () => {
    expect(formatDuration(45000)).toBe('45 сек')
    expect(formatDuration(59000)).toBe('59 сек')
  })

  it('renders minutes at and above the one-minute boundary', () => {
    expect(formatDuration(60000)).toBe('1 мин')
  })

  it('rounds seconds with Math.round', () => {
    expect(formatDuration(1499)).toBe('1 сек')
    expect(formatDuration(1500)).toBe('2 сек')
  })

  it('rounds minutes with Math.round', () => {
    expect(formatDuration(90000)).toBe('2 мин')
    expect(formatDuration(89000)).toBe('1 мин')
  })
})

describe('formatCredits', () => {
  it('appends the credits suffix', () => {
    expect(formatCredits(80)).toBe('80 кр')
    expect(formatCredits(0)).toBe('0 кр')
  })
})

describe('formatPercent', () => {
  it('rounds and appends the percent sign', () => {
    expect(formatPercent(64)).toBe('64%')
    expect(formatPercent(64.6)).toBe('65%')
    expect(formatPercent(0)).toBe('0%')
  })
})

describe('formatEta', () => {
  it('done + etaMs -> "готово за {dur}"', () => {
    const task = makeTask({ status: 'done', etaMs: 12000 })
    expect(formatEta(task)).toBe('готово за 12 сек')
  })

  it('running + etaMs -> "~{dur}"', () => {
    const task = makeTask({ status: 'running', etaMs: 60000 })
    expect(formatEta(task)).toBe('~1 мин')
  })

  it('etaMs with another status -> "{dur}"', () => {
    const task = makeTask({ status: 'queued', etaMs: 45000 })
    expect(formatEta(task)).toBe('45 сек')
  })

  it('no etaMs -> falls back to durationMs', () => {
    const task = makeTask({ status: 'queued', etaMs: undefined, durationMs: 8000 })
    expect(formatEta(task)).toBe('8 сек')
  })

  it('treats etaMs=0 as absent and uses durationMs', () => {
    const task = makeTask({ status: 'running', etaMs: 0, durationMs: 26000 })
    expect(formatEta(task)).toBe('26 сек')
  })
})
