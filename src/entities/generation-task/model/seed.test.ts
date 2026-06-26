import { describe, it, expect } from 'vitest'
import type { GenType, TaskStatus } from './types'
import { createSeed, DURATION_BY_TYPE } from './seed'

const NOW = 5_000_000
const CREDITS_BY_TYPE: Record<GenType, number> = { text: 6, image: 80, audio: 30, video: 150 }

describe('createSeed', () => {
  it('returns exactly 12 tasks with ids seed-1..seed-12', () => {
    const tasks = createSeed(NOW)
    expect(tasks).toHaveLength(12)
    expect(tasks.map((t) => t.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `seed-${i + 1}`),
    )
  })

  it('is deterministic for the same `now`', () => {
    expect(createSeed(NOW)).toEqual(createSeed(NOW))
  })

  it('sets durationMs from DURATION_BY_TYPE per task type', () => {
    for (const task of createSeed(NOW)) {
      expect(task.durationMs).toBe(DURATION_BY_TYPE[task.type])
    }
  })

  it('sets credits per type (text:6, image:80, audio:30, video:150)', () => {
    for (const task of createSeed(NOW)) {
      expect(task.credits).toBe(CREDITS_BY_TYPE[task.type])
    }
  })

  it('orders createdAt ascending by index (now - (20 - i) * 60000)', () => {
    const tasks = createSeed(NOW)
    tasks.forEach((task, i) => {
      const index = i + 1
      expect(task.createdAt).toBe(NOW - (20 - index) * 60_000)
    })
    const createdAt = tasks.map((t) => t.createdAt)
    const sorted = [...createdAt].sort((a, b) => a - b)
    expect(createdAt).toEqual(sorted)
  })

  it('contains the expected status mix', () => {
    const tasks = createSeed(NOW)
    const count = (status: TaskStatus) => tasks.filter((t) => t.status === status).length
    expect(count('running')).toBeGreaterThanOrEqual(2)
    expect(count('queued')).toBeGreaterThanOrEqual(1)
    expect(count('done')).toBeGreaterThanOrEqual(1)
    expect(count('failed')).toBeGreaterThanOrEqual(1)
    expect(count('canceled')).toBeGreaterThanOrEqual(1)
  })
})
