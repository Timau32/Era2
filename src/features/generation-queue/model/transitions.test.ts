import { describe, it, expect } from 'vitest'
import type { GenerationTask, TaskStatus } from '@/entities/generation-task'
import { canTransition, applyTransition } from './transitions'

/** Минимальная фабрика задачи для тестов переходов. */
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

const NOW = 1_000_000

describe('canTransition', () => {
  const cases: Array<[TaskStatus, TaskStatus, boolean]> = [
    ['queued', 'running', true],
    ['queued', 'canceled', true],
    ['queued', 'done', false],
    ['queued', 'failed', false],
    ['running', 'done', true],
    ['running', 'failed', true],
    ['running', 'canceled', true],
    ['running', 'queued', false],
    ['done', 'queued', false],
    ['done', 'running', false],
    ['failed', 'queued', true],
    ['failed', 'running', false],
    ['canceled', 'queued', true],
    ['canceled', 'running', false],
  ]

  it.each(cases)('%s -> %s = %s', (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected)
  })
})

describe('applyTransition', () => {
  it('returns the SAME reference unchanged on an invalid transition', () => {
    const task = makeTask({ status: 'done' })
    const result = applyTransition(task, 'running', NOW)
    expect(result).toBe(task)
  })

  it('returns a NEW object on a valid transition', () => {
    const task = makeTask({ status: 'queued' })
    const result = applyTransition(task, 'running', NOW)
    expect(result).not.toBe(task)
  })

  it('does not mutate the original task', () => {
    const task = makeTask({ status: 'queued', progress: 0 })
    const snapshot = { ...task }
    applyTransition(task, 'running', NOW)
    expect(task).toEqual(snapshot)
  })

  it('running -> sets startedAt=now and clears error', () => {
    const task = makeTask({ status: 'queued', error: 'boom' })
    const result = applyTransition(task, 'running', NOW)
    expect(result.status).toBe('running')
    expect(result.startedAt).toBe(NOW)
    expect(result.error).toBeUndefined()
  })

  it('done -> sets progress=100 and finishedAt=now', () => {
    const task = makeTask({ status: 'running', progress: 42 })
    const result = applyTransition(task, 'done', NOW)
    expect(result.status).toBe('done')
    expect(result.progress).toBe(100)
    expect(result.finishedAt).toBe(NOW)
  })

  it('failed -> sets finishedAt=now', () => {
    const task = makeTask({ status: 'running', progress: 50 })
    const result = applyTransition(task, 'failed', NOW)
    expect(result.status).toBe('failed')
    expect(result.finishedAt).toBe(NOW)
    expect(result.progress).toBe(50)
  })

  it('canceled -> sets finishedAt=now', () => {
    const task = makeTask({ status: 'running', progress: 50 })
    const result = applyTransition(task, 'canceled', NOW)
    expect(result.status).toBe('canceled')
    expect(result.finishedAt).toBe(NOW)
  })

  it('queued -> resets progress, startedAt, finishedAt and error', () => {
    const task = makeTask({
      status: 'failed',
      progress: 80,
      startedAt: 1,
      finishedAt: 2,
      error: 'boom',
    })
    const result = applyTransition(task, 'queued', NOW)
    expect(result.status).toBe('queued')
    expect(result.progress).toBe(0)
    expect(result.startedAt).toBeUndefined()
    expect(result.finishedAt).toBeUndefined()
    expect(result.error).toBeUndefined()
  })

  it('spreads patch BEFORE deriving switch fields (derived fields win)', () => {
    const task = makeTask({ status: 'running' })
    const result = applyTransition(task, 'done', NOW, { progress: 7 })
    expect(result.progress).toBe(100)
  })

  it('keeps patch fields that are not overwritten by derived fields', () => {
    const task = makeTask({ status: 'running' })
    const result = applyTransition(task, 'failed', NOW, { error: 'custom error' })
    expect(result.error).toBe('custom error')
    expect(result.status).toBe('failed')
    expect(result.finishedAt).toBe(NOW)
  })
})
