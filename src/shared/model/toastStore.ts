import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>, durationMs?: number) => void
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, durationMs = 5000) => {
    const id = `toast-${counter++}`
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    window.setTimeout(() => get().dismiss(id), durationMs)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** Удобный хелпер вызова тоста из любого места. */
export function showToast(t: Omit<Toast, 'id'>, durationMs?: number) {
  useToastStore.getState().push(t, durationMs)
}
