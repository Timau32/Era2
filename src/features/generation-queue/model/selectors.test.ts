import { describe, it, expect } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import {
  selectCounts,
  selectVisibleTasks,
  selectActiveTasks,
  selectAverageProgress,
  selectQueuePosition,
} from './selectors'

/** Минимальная фабрика задачи для тестов селекторов. */
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

describe('selectCounts', () => {
  it('counts tasks per status', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'queued' }),
      makeTask({ id: 'b', status: 'queued' }),
      makeTask({ id: 'c', status: 'running' }),
      makeTask({ id: 'd', status: 'done' }),
      makeTask({ id: 'e', status: 'failed' }),
      makeTask({ id: 'f', status: 'canceled' }),
    ]
    expect(selectCounts(tasks)).toEqual({ queued: 2, running: 1, done: 1, failed: 1 })
  })

  it('returns all zeros for an empty list', () => {
    expect(selectCounts([])).toEqual({ queued: 0, running: 0, done: 0, failed: 0 })
  })
})

describe('selectVisibleTasks', () => {
  const base = [
    makeTask({ id: 'a', status: 'queued', type: 'text', prompt: 'Cyberpunk city', createdAt: 100 }),
    makeTask({ id: 'b', status: 'running', type: 'image', prompt: 'Neon CITY at night', createdAt: 300 }),
    makeTask({ id: 'c', status: 'done', type: 'video', prompt: 'Mountain lake', createdAt: 200 }),
  ]

  it('"all" filters do not narrow the result', () => {
    const result = selectVisibleTasks({
      tasks: base,
      statusFilter: 'all',
      typeFilter: 'all',
      search: '',
      sort: 'newest',
    })
    expect(result).toHaveLength(3)
  })

  it('filters by status', () => {
    const result = selectVisibleTasks({
      tasks: base,
      statusFilter: 'running',
      typeFilter: 'all',
      search: '',
      sort: 'newest',
    })
    expect(result.map((t) => t.id)).toEqual(['b'])
  })

  it('filters by type', () => {
    const result = selectVisibleTasks({
      tasks: base,
      statusFilter: 'all',
      typeFilter: 'video',
      search: '',
      sort: 'newest',
    })
    expect(result.map((t) => t.id)).toEqual(['c'])
  })

  it('searches the prompt case-insensitively and trims the query', () => {
    const result = selectVisibleTasks({
      tasks: base,
      statusFilter: 'all',
      typeFilter: 'all',
      search: '  CITY  ',
      sort: 'oldest',
    })
    expect(result.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('sorts newest first (createdAt desc)', () => {
    const result = selectVisibleTasks({
      tasks: base,
      statusFilter: 'all',
      typeFilter: 'all',
      search: '',
      sort: 'newest',
    })
    expect(result.map((t) => t.createdAt)).toEqual([300, 200, 100])
  })

  it('sorts oldest first (createdAt asc)', () => {
    const result = selectVisibleTasks({
      tasks: base,
      statusFilter: 'all',
      typeFilter: 'all',
      search: '',
      sort: 'oldest',
    })
    expect(result.map((t) => t.createdAt)).toEqual([100, 200, 300])
  })

  it('does not mutate the input array', () => {
    const tasks = [...base]
    const order = tasks.map((t) => t.id)
    selectVisibleTasks({
      tasks,
      statusFilter: 'all',
      typeFilter: 'all',
      search: '',
      sort: 'newest',
    })
    expect(tasks.map((t) => t.id)).toEqual(order)
  })

  it('combines status, type and search filters', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'queued', type: 'image', prompt: 'fox' }),
      makeTask({ id: 'b', status: 'queued', type: 'image', prompt: 'cat' }),
      makeTask({ id: 'c', status: 'running', type: 'image', prompt: 'fox' }),
    ]
    const result = selectVisibleTasks({
      tasks,
      statusFilter: 'queued',
      typeFilter: 'image',
      search: 'fox',
      sort: 'newest',
    })
    expect(result.map((t) => t.id)).toEqual(['a'])
  })
})

describe('selectActiveTasks', () => {
  it('returns only running and queued tasks', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'queued' }),
      makeTask({ id: 'b', status: 'running' }),
      makeTask({ id: 'c', status: 'done' }),
      makeTask({ id: 'd', status: 'failed' }),
      makeTask({ id: 'e', status: 'canceled' }),
    ]
    expect(selectActiveTasks(tasks).map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('selectAverageProgress', () => {
  it('returns 0 for an empty list', () => {
    expect(selectAverageProgress([])).toBe(0)
  })

  it('returns 0 when there are no active tasks', () => {
    const tasks = [makeTask({ status: 'done', progress: 100 })]
    expect(selectAverageProgress(tasks)).toBe(0)
  })

  it('averages running progress and counts queued as 0', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'running', progress: 80 }),
      makeTask({ id: 'b', status: 'queued', progress: 50 }),
    ]
    expect(selectAverageProgress(tasks)).toBe(40)
  })

  it('ignores non-active tasks in the average', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'running', progress: 60 }),
      makeTask({ id: 'b', status: 'done', progress: 100 }),
    ]
    expect(selectAverageProgress(tasks)).toBe(60)
  })
})

describe('selectQueuePosition', () => {
  const tasks = [
    makeTask({ id: 'q1', status: 'queued', createdAt: 300 }),
    makeTask({ id: 'q2', status: 'queued', createdAt: 100 }),
    makeTask({ id: 'q3', status: 'queued', createdAt: 200 }),
    makeTask({ id: 'r1', status: 'running', createdAt: 50 }),
  ]

  it('returns 1-based position ordered by createdAt asc', () => {
    expect(selectQueuePosition(tasks, 'q2')).toBe(1)
    expect(selectQueuePosition(tasks, 'q3')).toBe(2)
    expect(selectQueuePosition(tasks, 'q1')).toBe(3)
  })

  it('returns null for a task that is not queued', () => {
    expect(selectQueuePosition(tasks, 'r1')).toBeNull()
  })

  it('returns null for an unknown id', () => {
    expect(selectQueuePosition(tasks, 'nope')).toBeNull()
  })
})
