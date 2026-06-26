import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GenerationTask, GenType, TaskStatus } from '@/entities/generation-task'
import { createSeed } from '@/entities/generation-task'
import { applyTransition } from './transitions'
import { LOAD_DELAY_MS } from './constants'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type StatusFilter = TaskStatus | 'all'
export type TypeFilter = GenType | 'all'
export type SortOrder = 'newest' | 'oldest'

interface QueueState {
  tasks: GenerationTask[]
  loadStatus: LoadStatus
  statusFilter: StatusFilter
  typeFilter: TypeFilter
  sort: SortOrder
  search: string
  initLoad: (now: number) => void
  /** Заменяет массив задач целиком (используется движком на тике). */
  tickReplace: (next: GenerationTask[]) => void
  cancel: (id: string) => void
  retry: (id: string) => void
  remove: (id: string) => void
  clearDone: () => void
  /** Восстанавливает снимок задач (для Undo). */
  restore: (snapshot: GenerationTask[]) => void
  setStatusFilter: (v: StatusFilter) => void
  setTypeFilter: (v: TypeFilter) => void
  setSort: (v: SortOrder) => void
  setSearch: (v: string) => void
}

const now = () => Date.now()

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      tasks: [],
      loadStatus: 'idle',
      statusFilter: 'all',
      typeFilter: 'all',
      sort: 'newest',
      search: '',

      initLoad: (startNow) => {
        if (get().loadStatus === 'loading') return
        set({ loadStatus: 'loading' })
        window.setTimeout(() => {
          set((s) => ({
            loadStatus: 'ready',
            tasks: s.tasks.length > 0 ? s.tasks : createSeed(startNow),
          }))
        }, LOAD_DELAY_MS)
      },

      tickReplace: (next) => set({ tasks: next }),

      cancel: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? applyTransition(t, 'canceled', now()) : t)),
        })),

      retry: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? applyTransition(t, 'queued', now()) : t)),
        })),

      remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      clearDone: () => set((s) => ({ tasks: s.tasks.filter((t) => t.status !== 'done') })),

      restore: (snapshot) => set({ tasks: snapshot }),

      setStatusFilter: (v) => set({ statusFilter: v }),
      setTypeFilter: (v) => set({ typeFilter: v }),
      setSort: (v) => set({ sort: v }),
      setSearch: (v) => set({ search: v }),
    }),
    {
      name: 'era2-queue',
      storage: createJSONStorage(() => localStorage),
      /** Сохраняем только данные и пользовательские предпочтения, не loadStatus. */
      partialize: (s) => ({
        tasks: s.tasks,
        statusFilter: s.statusFilter,
        typeFilter: s.typeFilter,
        sort: s.sort,
      }),
      /** При восстановлении running → queued (прогресс в 0), чтобы движок переподхватил по слотам. */
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.tasks = state.tasks.map((t) =>
          t.status === 'running' ? { ...t, status: 'queued', progress: 0, startedAt: undefined } : t,
        )
      },
    },
  ),
)
