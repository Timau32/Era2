# «Очередь генераций» для ERA2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать экран `/queue` с «живым» клиентским движком очереди генераций и глобальным плавающим статус-баром, по макету ERA2 и спецификации `docs/superpowers/specs/2026-06-26-generation-queue-design.md`.

**Architecture:** FSD (`app → pages → widgets → features → entities → shared`). Единый источник правды — Zustand-стор (`features/generation-queue/model/queueStore.ts`); мок-движок (`queueEngine.ts`) дёргает экшены стора через единый тикер; селекторы — чистые функции. UI «тупой» — данные + колбэки. Список виртуализирован (`@tanstack/react-virtual`), анимации — `framer-motion`.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, Zustand, react-router-dom, @tanstack/react-virtual, framer-motion, lucide-react, clsx + tailwind-merge, Geist / Geist Mono.

## Global Constraints

- React 19 + TypeScript strict; не использовать `forwardRef` (ref как обычный проп).
- FSD: импорт между слайсами **только через `index.ts`** слайса, без deep-import и без `../../..`. Alias `@/` = `src/`.
- Один компонент = один файл, имя файла = имя компонента.
- Вся бизнес-логика — в `features/generation-queue/model/` и `lib/`, **не в компонентах**.
- Типы домена — только в `entities/generation-task/model/types.ts`.
- JSDoc вместо инлайн-комментариев (фронтенд-конвенция проекта).
- `MAX_CONCURRENT = 2`; вероятность сбоя ~15%; стартовый сид 8–12 задач.
- Акцент `#E85420`; тёмная тема «warm coal»; шрифт Geist (фолбэк Inter — отметить в README).
- Виртуализация списка — обязательна.
- Верификация без автотестов: `npx tsc --noEmit` (0 ошибок) + `npm run lint` (0 ошибок) + ручная проверка поведения в `npm run dev`.
- Проект **не** git-репозиторий: если выбран коммит-флоу — на Task 0 выполнить `git init`; иначе шаги `git commit` трактуются как «зафиксировать завершённую задачу» опционально.

---

## File Structure

```
src/
├─ app/
│  ├─ App.tsx                       # RouterProvider + старт движка
│  ├─ providers/router.tsx          # маршруты + RootLayout
│  └─ layouts/RootLayout.tsx        # <Outlet/> + глобальный StatusBar
├─ entities/generation-task/
│  ├─ model/types.ts                # GenType, TaskStatus, GenerationTask, TYPE_LABELS
│  ├─ model/seed.ts                 # createSeed(): GenerationTask[]
│  └─ index.ts
├─ features/generation-queue/
│  ├─ model/
│  │  ├─ constants.ts               # MAX_CONCURRENT, TICK_MS, FAIL_RATE, длительности, тексты ошибок
│  │  ├─ transitions.ts             # canTransition(), applyTransition() — чистый автомат
│  │  ├─ queueStore.ts              # zustand store + persist
│  │  ├─ queueEngine.ts             # createEngine(store): start/stop тикер
│  │  ├─ useQueueEngine.ts          # хук жизненного цикла движка
│  │  ├─ selectors.ts               # счётчики/фильтр/сортировка/поиск/активные/средний прогресс
│  │  └─ useQueue.ts                # публичный хук состояния+действий
│  ├─ ui/
│  │  ├─ StatusBadge.tsx
│  │  ├─ ProgressBar.tsx
│  │  ├─ TaskTypeIcon.tsx
│  │  ├─ TaskMeta.tsx
│  │  ├─ TaskActions.tsx
│  │  ├─ TaskRow.tsx
│  │  ├─ TaskCard.tsx
│  │  ├─ QueueStats.tsx
│  │  ├─ QueueToolbar.tsx
│  │  ├─ TaskList.tsx               # виртуализированный список (row/card по брейкпоинту)
│  │  ├─ StatusBar.tsx              # глобальный индикатор
│  │  └─ states/{EmptyState,LoadingState,ErrorState}.tsx
│  ├─ lib/formatEta.ts              # форматтеры времени/кредитов/процентов
│  └─ index.ts
├─ widgets/generation-queue/
│  ├─ ui/GenerationQueue.tsx
│  └─ index.ts
├─ pages/
│  ├─ QueuePage.tsx
│  └─ ChatPage.tsx
└─ shared/
   ├─ lib/cn.ts
   ├─ lib/useMediaQuery.ts
   ├─ lib/useDebouncedValue.ts
   ├─ ui/Button.tsx
   ├─ ui/IconButton.tsx
   ├─ ui/Chip.tsx
   ├─ ui/Badge.tsx
   ├─ ui/Card.tsx
   ├─ ui/Input.tsx
   ├─ ui/Skeleton.tsx
   ├─ ui/ModelPill.tsx
   ├─ ui/Toast.tsx + model/toastStore.ts
   └─ index.ts
```

---

## Task 0: Тех. сетап (зависимости, Tailwind, alias, шрифты)

**Files:**
- Modify: `package.json`, `vite.config.ts`, `tsconfig.app.json`, `index.html`, `src/main.tsx`
- Create: `src/index.css` (перезаписать), `src/app/App.tsx`
- Delete: `src/App.tsx`, `src/App.css`, `src/assets/*` (демо-шаблон)

**Interfaces:**
- Produces: alias `@/` → `src/`; Tailwind-токены (`bg-background`, `text-foreground`, `text-primary`, `font-mono` и т.д.); шрифты Geist/Geist Mono.

- [ ] **Step 1: Установить зависимости**

```bash
npm i zustand react-router-dom framer-motion lucide-react clsx tailwind-merge @tanstack/react-virtual @fontsource-variable/geist @fontsource-variable/geist-mono
npm i -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Подключить Tailwind v4 и alias в `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

- [ ] **Step 3: Прописать paths в `tsconfig.app.json`**

В `compilerOptions` добавить:

```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

- [ ] **Step 4: Тема и токены в `src/index.css`** (перезаписать файл целиком)

> Hex-значения — приближение из скриншота дизайн-системы; уточнить по Figma при наличии доступа.

```css
@import '@fontsource-variable/geist';
@import '@fontsource-variable/geist-mono';
@import 'tailwindcss';

@theme {
  --font-sans: 'Geist Variable', Inter, system-ui, sans-serif;
  --font-mono: 'Geist Mono Variable', ui-monospace, monospace;

  --color-background: #0e0c0b;
  --color-foreground: #f5f0ea;
  --color-card: #17130f;
  --color-card-foreground: #f5f0ea;
  --color-secondary: #241e1a;
  --color-secondary-foreground: #f5f0ea;
  --color-muted: #1f1a16;
  --color-muted-foreground: #a89e94;
  --color-accent: #3a1f12;
  --color-accent-foreground: #e85420;
  --color-primary: #e85420;
  --color-primary-foreground: #ffffff;
  --color-destructive: #e5484d;
  --color-destructive-foreground: #ffffff;
  --color-border: #2e2723;
  --color-input: #17130f;
  --color-ring: #e85420;

  --color-status-queued: #a89e94;
  --color-status-running: #e85420;
  --color-status-done: #3dd68c;
  --color-status-failed: #e5484d;
  --color-status-canceled: #6f6760;

  --color-era-accent-hi: #f3a57a;
  --radius-pill: 9999px;
}

html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 5: Точка входа** — создать `src/app/App.tsx` (временно), переписать `src/main.tsx`

`src/app/App.tsx`:

```tsx
/** Корневой компонент приложения (роутер подключим в Task 12). */
export function App() {
  return <div className="p-8 font-mono text-primary">ERA2 boot ok</div>
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Удалить демо-файлы шаблона**

```bash
rm -f src/App.tsx src/App.css src/assets/react.svg src/assets/hero.png
```

(оставить `src/assets/` если пуст — не критично; `vite.svg` в `public` не трогаем)

- [ ] **Step 7: Верификация**

Run: `npx tsc --noEmit && npm run lint && npm run dev`
Expected: type-check и lint без ошибок; в браузере на `/` видно «ERA2 boot ok» оранжевым моно-шрифтом на тёмном фоне.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "(feat): tech setup — tailwind, alias, fonts, theme tokens"
```

---

## Task 1: Доменная модель и сид (`entities/generation-task`)

**Files:**
- Create: `src/entities/generation-task/model/types.ts`, `src/entities/generation-task/model/seed.ts`, `src/entities/generation-task/index.ts`

**Interfaces:**
- Produces:
  - `type GenType = 'text' | 'image' | 'video' | 'audio'`
  - `type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled'`
  - `interface GenerationTask { id; type: GenType; prompt; model; status: TaskStatus; progress: number; createdAt: number; startedAt?: number; finishedAt?: number; etaMs?: number; durationMs: number; credits: number; error?: string }`
  - `const TYPE_LABELS: Record<GenType, string>`
  - `function createSeed(now: number): GenerationTask[]`

- [ ] **Step 1: `types.ts`**

```ts
/** Тип генерации (определяет иконку и базовую длительность). */
export type GenType = 'text' | 'image' | 'video' | 'audio'

/** Статус задачи в конечном автомате очереди. */
export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled'

/** Бизнес-сущность задачи генерации. */
export interface GenerationTask {
  id: string
  type: GenType
  prompt: string
  model: string
  status: TaskStatus
  /** Прогресс 0..100. */
  progress: number
  /** Время создания (мс) — задаёт FIFO-порядок очереди. */
  createdAt: number
  startedAt?: number
  finishedAt?: number
  /** Оценочное/итоговое время выполнения, мс. */
  etaMs?: number
  /** Плановая длительность, мс (зависит от типа). */
  durationMs: number
  /** Стоимость в кредитах. */
  credits: number
  /** Текст ошибки для статуса failed. */
  error?: string
}

/** Человекочитаемые подписи типов. */
export const TYPE_LABELS: Record<GenType, string> = {
  text: 'Текст',
  image: 'Изображение',
  video: 'Видео',
  audio: 'Аудио',
}
```

- [ ] **Step 2: `seed.ts`** (8–12 задач, разные статусы)

```ts
import type { GenerationTask, GenType } from './types'

/** Плановая длительность по типу: video/audio заметно дольше. */
export const DURATION_BY_TYPE: Record<GenType, number> = {
  text: 8000,
  image: 14000,
  audio: 26000,
  video: 40000,
}

/**
 * Стартовый датасет 10 задач: 2 running с прогрессом, queued, done, failed, canceled.
 * @param now - текущее время (мс), передаётся снаружи для детерминизма.
 */
export function createSeed(now: number): GenerationTask[] {
  const min = 60_000
  const make = (
    i: number,
    type: GenType,
    prompt: string,
    model: string,
    status: GenerationTask['status'],
    extra: Partial<GenerationTask> = {},
  ): GenerationTask => ({
    id: `seed-${i}`,
    type,
    prompt,
    model,
    status,
    progress: 0,
    createdAt: now - (20 - i) * min,
    durationMs: DURATION_BY_TYPE[type],
    credits: { text: 6, image: 80, audio: 30, video: 150 }[type],
    ...extra,
  })

  return [
    make(1, 'image', 'Неоновый киберпанк-город под дождём, вид сверху', 'Midjourney v6', 'running', { progress: 64, startedAt: now - 9000, etaMs: 14000 }),
    make(2, 'video', 'Дрон-облёт горного озера на рассвете, 5 сек', 'Kling 3.0', 'running', { progress: 28, startedAt: now - 12000, etaMs: 40000 }),
    make(3, 'text', 'Сценарий рекламного ролика для кофейни, 30 секунд', 'GPT-4o', 'queued'),
    make(4, 'image', 'Минималистичный логотип кофейни, бежевые тона', 'Flux', 'done', { progress: 100, finishedAt: now - 30000, etaMs: 12000 }),
    make(5, 'audio', 'Озвучка приветствия мужским голосом', 'ElevenLabs', 'failed', { error: 'Недостаточно кредитов' }),
    make(6, 'image', 'Постер в стиле ретро-футуризма 80-х', 'Seedream', 'canceled', { error: 'Отменено пользователем' }),
    make(7, 'text', 'Описание товара для маркетплейса, 3 варианта', 'Claude 3.5', 'queued'),
    make(8, 'image', 'Иллюстрация лисы-астронавта в плоском стиле', 'Flux', 'done', { progress: 100, finishedAt: now - 120000, etaMs: 13000 }),
    make(9, 'audio', 'Фоновая музыка lo-fi для видео, 60 сек', 'Suno v4', 'queued'),
    make(10, 'video', 'Анимация логотипа с частицами, 3 сек', 'Runway Gen-3', 'failed', { error: 'Модель временно недоступна' }),
  ]
}
```

- [ ] **Step 3: `index.ts`**

```ts
export type { GenType, TaskStatus, GenerationTask } from './model/types'
export { TYPE_LABELS } from './model/types'
export { createSeed, DURATION_BY_TYPE } from './model/seed'
```

- [ ] **Step 4: Верификация**

Run: `npx tsc --noEmit`
Expected: 0 ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/entities && git commit -m "(feat): generation-task entity — types and seed"
```

---

## Task 2: Конечный автомат переходов (`transitions.ts`)

**Files:**
- Create: `src/features/generation-queue/model/constants.ts`, `src/features/generation-queue/model/transitions.ts`

**Interfaces:**
- Consumes: `GenerationTask`, `TaskStatus` из `@/entities/generation-task`.
- Produces:
  - `const MAX_CONCURRENT = 2`, `const TICK_MS = 500`, `const FAIL_RATE = 0.15`, `const ERROR_MESSAGES: string[]`
  - `function canTransition(from: TaskStatus, to: TaskStatus): boolean`
  - `function applyTransition(task: GenerationTask, to: TaskStatus, now: number, patch?: Partial<GenerationTask>): GenerationTask` — возвращает новый объект, не мутирует.

- [ ] **Step 1: `constants.ts`**

```ts
/** Максимум одновременно выполняемых задач. */
export const MAX_CONCURRENT = 2
/** Интервал тика движка, мс. */
export const TICK_MS = 500
/** Вероятность сбоя running-задачи на одном тике. */
export const FAIL_RATE = 0.15
/** Задержка эмуляции первичной загрузки, мс. */
export const LOAD_DELAY_MS = 600
/** Вероятность сбоя инициализации (для ErrorState). */
export const INIT_FAIL_RATE = 0
/** Варианты текста ошибки. */
export const ERROR_MESSAGES = [
  'Недостаточно кредитов',
  'Превышено время ожидания',
  'Модель временно недоступна',
] as const
```

> `INIT_FAIL_RATE = 0` по умолчанию (демо-стабильность). Сбой инициализации триггерится отдельной кнопкой в ErrorState-демо/через флаг — см. Task 4.

- [ ] **Step 2: `transitions.ts`**

```ts
import type { GenerationTask, TaskStatus } from '@/entities/generation-task'

/** Разрешённые переходы конечного автомата. */
const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  queued: ['running', 'canceled'],
  running: ['done', 'failed', 'canceled'],
  done: [],
  failed: ['queued'],
  canceled: ['queued'],
}

/** Проверяет допустимость перехода статуса. */
export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED[from].includes(to)
}

/**
 * Применяет переход статуса, возвращая НОВЫЙ объект задачи.
 * Сбрасывает/выставляет производные поля (progress, startedAt, finishedAt, error).
 * При недопустимом переходе возвращает исходную задачу без изменений.
 */
export function applyTransition(
  task: GenerationTask,
  to: TaskStatus,
  now: number,
  patch: Partial<GenerationTask> = {},
): GenerationTask {
  if (!canTransition(task.status, to)) return task
  const base: GenerationTask = { ...task, status: to, ...patch }
  switch (to) {
    case 'running':
      return { ...base, startedAt: now, error: undefined }
    case 'done':
      return { ...base, progress: 100, finishedAt: now }
    case 'failed':
      return { ...base, finishedAt: now }
    case 'canceled':
      return { ...base, finishedAt: now }
    case 'queued':
      return { ...base, progress: 0, startedAt: undefined, finishedAt: undefined, error: undefined }
    default:
      return base
  }
}
```

- [ ] **Step 3: Верификация**

Run: `npx tsc --noEmit`
Expected: 0 ошибок.

Ручная самопроверка логики (прочитать): `queued→running` ставит `startedAt`; `running→done` ставит `progress=100`; `failed→queued` обнуляет `progress`/`error`; `done→running` запрещён (вернёт исходный объект).

- [ ] **Step 4: Commit**

```bash
git add src/features/generation-queue/model/constants.ts src/features/generation-queue/model/transitions.ts && git commit -m "(feat): queue state machine — transitions and constants"
```

---

## Task 3: Стор Zustand + персистентность (`queueStore.ts`)

**Files:**
- Create: `src/features/generation-queue/model/queueStore.ts`

**Interfaces:**
- Consumes: `GenerationTask`, `TaskStatus`, `GenType`, `createSeed`; `applyTransition`, `MAX_CONCURRENT`.
- Produces zustand-хук `useQueueStore` со state и actions:
  - State: `tasks: GenerationTask[]`, `loadStatus: 'idle'|'loading'|'ready'|'error'`, `statusFilter: TaskStatus|'all'`, `typeFilter: GenType|'all'`, `sort: 'newest'|'oldest'`, `search: string`
  - Actions: `initLoad(now)`, `tickReplace(next)`, `cancel(id)`, `retry(id)`, `remove(id)`, `clearDone()`, `restore(snapshot)`, `setStatusFilter(v)`, `setTypeFilter(v)`, `setSort(v)`, `setSearch(v)`
  - Хелпер: `getState()/setState()` доступны движку через `useQueueStore`.

- [ ] **Step 1: Реализация стора**

```ts
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
```

- [ ] **Step 2: Верификация**

Run: `npx tsc --noEmit`
Expected: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/features/generation-queue/model/queueStore.ts && git commit -m "(feat): zustand queue store with localStorage persistence"
```

---

## Task 4: Мок-движок + хук жизненного цикла (`queueEngine.ts`, `useQueueEngine.ts`)

**Files:**
- Create: `src/features/generation-queue/model/queueEngine.ts`, `src/features/generation-queue/model/useQueueEngine.ts`

**Interfaces:**
- Consumes: `useQueueStore`; `applyTransition`; `MAX_CONCURRENT`, `TICK_MS`, `FAIL_RATE`, `ERROR_MESSAGES`.
- Produces:
  - `function createEngine(): { start: () => void; stop: () => void }`
  - `function useQueueEngine(): void` — стартует движок на mount, чистит на unmount, инициирует `initLoad`.

- [ ] **Step 1: `queueEngine.ts`**

```ts
import type { GenerationTask } from '@/entities/generation-task'
import { useQueueStore } from './queueStore'
import { applyTransition } from './transitions'
import { MAX_CONCURRENT, TICK_MS, FAIL_RATE, ERROR_MESSAGES } from './constants'

/** Случайный текст ошибки. */
function randomError(): string {
  return ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
}

/** Шаг прогресса за тик: чем длиннее durationMs, тем меньше шаг. */
function progressStep(task: GenerationTask): number {
  const ticksToComplete = Math.max(1, task.durationMs / TICK_MS)
  const base = 100 / ticksToComplete
  return base * (0.6 + Math.random() * 0.8) // разброс шага
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
  let freeSlots = MAX_CONCURRENT - runningCount
  if (freeSlots > 0) {
    const queued = next
      .filter((t) => t.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt)
    const promote = new Set(queued.slice(0, freeSlots).map((t) => t.id))
    next = next.map((t) => (promote.has(t.id) ? applyTransition(t, 'running', now) : t))
    freeSlots -= promote.size
  }
  return next
}

/** Создаёт движок очереди на одном интервале. */
export function createEngine() {
  let timer: number | null = null
  return {
    start() {
      if (timer !== null) return
      timer = window.setInterval(() => {
        const { tasks, tickReplace } = useQueueStore.getState()
        tickReplace(tick(tasks, Date.now()))
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
```

- [ ] **Step 2: `useQueueEngine.ts`**

```ts
import { useEffect } from 'react'
import { useQueueStore } from './queueStore'
import { createEngine } from './queueEngine'

/**
 * Запускает мок-движок на время жизни компонента и инициирует первичную загрузку.
 * Чистит интервал на unmount (требование ТЗ: корректные таймеры).
 */
export function useQueueEngine(): void {
  useEffect(() => {
    const engine = createEngine()
    useQueueStore.getState().initLoad(Date.now())
    engine.start()
    return () => engine.stop()
  }, [])
}
```

- [ ] **Step 3: Верификация**

Run: `npx tsc --noEmit`
Expected: 0 ошибок.

Самопроверка логики (прочитать `tick`): running не больше `MAX_CONCURRENT` после добора; `cancel` (через стор) убирает из running → на следующем тике слот свободен; завершённые получают `progress=100`.

- [ ] **Step 4: Commit**

```bash
git add src/features/generation-queue/model/queueEngine.ts src/features/generation-queue/model/useQueueEngine.ts && git commit -m "(feat): mock queue engine with single ticker and slot limit"
```

---

## Task 5: Селекторы + публичный хук + форматтеры (`selectors.ts`, `useQueue.ts`, `lib/formatEta.ts`)

**Files:**
- Create: `src/features/generation-queue/model/selectors.ts`, `src/features/generation-queue/model/useQueue.ts`, `src/features/generation-queue/lib/formatEta.ts`

**Interfaces:**
- Consumes: `useQueueStore`, типы фильтров; `GenerationTask`.
- Produces:
  - `selectCounts(tasks): { queued; running; done; failed }`
  - `selectVisibleTasks(state): GenerationTask[]`
  - `selectActiveTasks(tasks): GenerationTask[]` (running+queued)
  - `selectAverageProgress(tasks): number`
  - `function useQueue()` → `{ tasks, visibleTasks, counts, active, avgProgress, loadStatus, filters, actions }`
  - formatEta: `formatDuration(ms): string`, `formatCredits(n): string`, `formatPercent(n): string`, `formatEta(task): string`

- [ ] **Step 1: `lib/formatEta.ts`**

```ts
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
```

- [ ] **Step 2: `selectors.ts`**

```ts
import type { GenerationTask } from '@/entities/generation-task'
import type { SortOrder, StatusFilter, TypeFilter } from './queueStore'

export interface QueueCounts {
  queued: number
  running: number
  done: number
  failed: number
}

/** Реактивные счётчики по статусам. */
export function selectCounts(tasks: GenerationTask[]): QueueCounts {
  return {
    queued: tasks.filter((t) => t.status === 'queued').length,
    running: tasks.filter((t) => t.status === 'running').length,
    done: tasks.filter((t) => t.status === 'done').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }
}

/** Фильтр по статусу/типу → поиск по промпту → сортировка. */
export function selectVisibleTasks(input: {
  tasks: GenerationTask[]
  statusFilter: StatusFilter
  typeFilter: TypeFilter
  search: string
  sort: SortOrder
}): GenerationTask[] {
  const { tasks, statusFilter, typeFilter, search, sort } = input
  const q = search.trim().toLowerCase()
  const filtered = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (q && !t.prompt.toLowerCase().includes(q)) return false
    return true
  })
  const dir = sort === 'newest' ? -1 : 1
  return [...filtered].sort((a, b) => (a.createdAt - b.createdAt) * dir)
}

/** Активные задачи (running + queued) для статус-бара. */
export function selectActiveTasks(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.filter((t) => t.status === 'running' || t.status === 'queued')
}

/** Усреднённый прогресс активных задач (queued считаем как 0). */
export function selectAverageProgress(tasks: GenerationTask[]): number {
  const active = selectActiveTasks(tasks)
  if (active.length === 0) return 0
  const sum = active.reduce((acc, t) => acc + (t.status === 'running' ? t.progress : 0), 0)
  return sum / active.length
}

/** Позиция queued-задачи в очереди (1-based) или null. */
export function selectQueuePosition(tasks: GenerationTask[], id: string): number | null {
  const queued = tasks
    .filter((t) => t.status === 'queued')
    .sort((a, b) => a.createdAt - b.createdAt)
  const idx = queued.findIndex((t) => t.id === id)
  return idx === -1 ? null : idx + 1
}
```

- [ ] **Step 3: `useQueue.ts`** (публичный хук)

```ts
import { useMemo } from 'react'
import { useQueueStore } from './queueStore'
import {
  selectCounts,
  selectVisibleTasks,
  selectActiveTasks,
  selectAverageProgress,
} from './selectors'

/** Публичный хук фичи: реактивное состояние очереди + действия. */
export function useQueue() {
  const tasks = useQueueStore((s) => s.tasks)
  const loadStatus = useQueueStore((s) => s.loadStatus)
  const statusFilter = useQueueStore((s) => s.statusFilter)
  const typeFilter = useQueueStore((s) => s.typeFilter)
  const sort = useQueueStore((s) => s.sort)
  const search = useQueueStore((s) => s.search)

  const counts = useMemo(() => selectCounts(tasks), [tasks])
  const visibleTasks = useMemo(
    () => selectVisibleTasks({ tasks, statusFilter, typeFilter, search, sort }),
    [tasks, statusFilter, typeFilter, search, sort],
  )
  const active = useMemo(() => selectActiveTasks(tasks), [tasks])
  const avgProgress = useMemo(() => selectAverageProgress(tasks), [tasks])

  return {
    tasks,
    visibleTasks,
    counts,
    active,
    avgProgress,
    loadStatus,
    filters: { statusFilter, typeFilter, sort, search },
    actions: {
      cancel: useQueueStore((s) => s.cancel),
      retry: useQueueStore((s) => s.retry),
      remove: useQueueStore((s) => s.remove),
      clearDone: useQueueStore((s) => s.clearDone),
      restore: useQueueStore((s) => s.restore),
      initLoad: useQueueStore((s) => s.initLoad),
      setStatusFilter: useQueueStore((s) => s.setStatusFilter),
      setTypeFilter: useQueueStore((s) => s.setTypeFilter),
      setSort: useQueueStore((s) => s.setSort),
      setSearch: useQueueStore((s) => s.setSearch),
    },
  }
}
```

- [ ] **Step 4: Верификация**

Run: `npx tsc --noEmit`
Expected: 0 ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/model/selectors.ts src/features/generation-queue/model/useQueue.ts src/features/generation-queue/lib/formatEta.ts && git commit -m "(feat): selectors, public useQueue hook, formatters"
```

---

## Task 6: Shared-утилиты и примитивы UI (часть 1)

**Files:**
- Create: `src/shared/lib/cn.ts`, `src/shared/lib/useMediaQuery.ts`, `src/shared/lib/useDebouncedValue.ts`, `src/shared/ui/Button.tsx`, `src/shared/ui/IconButton.tsx`, `src/shared/ui/Chip.tsx`, `src/shared/ui/Badge.tsx`

**Interfaces:**
- Produces:
  - `cn(...classes): string`
  - `useMediaQuery(query): boolean`
  - `useDebouncedValue<T>(value, delayMs): T`
  - `<Button variant? size? ...>`, `<IconButton label ...>`, `<Chip active? ...>`, `<Badge tone? ...>`

- [ ] **Step 1: `cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Склейка классов с разрешением конфликтов Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: `useMediaQuery.ts`**

```ts
import { useEffect, useState } from 'react'

/** Реактивно отслеживает media-query (для desktop/mobile-рендера). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
```

- [ ] **Step 3: `useDebouncedValue.ts`**

```ts
import { useEffect, useState } from 'react'

/** Возвращает значение с задержкой (debounce) — для поиска. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}
```

- [ ] **Step 4: `Button.tsx`** (pill, варианты по макету)

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border text-foreground hover:bg-secondary/50',
  ghost: 'text-foreground hover:bg-secondary/50',
  link: 'text-primary underline-offset-4 hover:underline',
}
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
}

/** Базовая pill-кнопка дизайн-системы ERA2. */
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 5: `IconButton.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Доступное имя (aria-label обязателен). */
  label: string
  children: ReactNode
}

/** Квадратная иконочная кнопка для действий строки. */
export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 6: `Chip.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

/** Чип-фильтр: активный — оранжевый filled, иначе outline. */
export function Chip({ active = false, className, children, ...rest }: ChipProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-pill px-3.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border text-muted-foreground hover:text-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 7: `Badge.tsx`**

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface BadgeProps {
  className?: string
  children: ReactNode
}

/** Пилюля-бейдж (цвет задаёт потребитель через className). */
export function Badge({ className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium', className)}>
      {children}
    </span>
  )
}
```

- [ ] **Step 8: Верификация**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 ошибок.

- [ ] **Step 9: Commit**

```bash
git add src/shared/lib src/shared/ui/Button.tsx src/shared/ui/IconButton.tsx src/shared/ui/Chip.tsx src/shared/ui/Badge.tsx && git commit -m "(feat): shared utils and base UI primitives"
```

---

## Task 7: Shared-примитивы UI (часть 2) + Toast-стор

**Files:**
- Create: `src/shared/ui/Card.tsx`, `src/shared/ui/Input.tsx`, `src/shared/ui/Skeleton.tsx`, `src/shared/ui/ModelPill.tsx`, `src/shared/model/toastStore.ts`, `src/shared/ui/Toast.tsx`, `src/shared/index.ts`

**Interfaces:**
- Consumes: `cn`, `Button`.
- Produces:
  - `<Card>`, `<Input>`, `<Skeleton>`, `<ModelPill model>`
  - `useToastStore` + `showToast({ message, actionLabel?, onAction?, durationMs? })`
  - `<ToastViewport/>` (рендер активных тостов)
  - публичный `shared/index.ts` реэкспортит все примитивы и `cn`, хуки.

- [ ] **Step 1: `Card.tsx`**

```tsx
import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/** Карточка-контейнер дизайн-системы. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-card', className)} {...rest} />
}
```

- [ ] **Step 2: `Input.tsx`**

```tsx
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/** Текстовый инпут дизайн-системы (rounded). */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 rounded-pill border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...rest}
    />
  )
}
```

- [ ] **Step 3: `Skeleton.tsx`**

```tsx
import { cn } from '@/shared/lib/cn'

/** Плейсхолдер-скелетон для состояния загрузки. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-secondary/60', className)} />
}
```

- [ ] **Step 4: `ModelPill.tsx`**

```tsx
import { cn } from '@/shared/lib/cn'

/** Пилюля модели: оранжевая точка + название в моно-шрифте. */
export function ModelPill({ model, className }: { model: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      {model}
    </span>
  )
}
```

- [ ] **Step 5: `model/toastStore.ts`**

```ts
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
```

- [ ] **Step 6: `Toast.tsx`** (viewport + анимация)

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from '@/shared/model/toastStore'
import { Button } from '@/shared/ui/Button'

/** Контейнер тостов (Undo-уведомления). */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-auto flex items-center gap-3 rounded-pill border border-border bg-card px-4 py-2 text-sm shadow-lg"
          >
            <span>{t.message}</span>
            {t.actionLabel && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  t.onAction?.()
                  dismiss(t.id)
                }}
              >
                {t.actionLabel}
              </Button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 7: `shared/index.ts`**

```ts
export { cn } from './lib/cn'
export { useMediaQuery } from './lib/useMediaQuery'
export { useDebouncedValue } from './lib/useDebouncedValue'
export { Button } from './ui/Button'
export { IconButton } from './ui/IconButton'
export { Chip } from './ui/Chip'
export { Badge } from './ui/Badge'
export { Card } from './ui/Card'
export { Input } from './ui/Input'
export { Skeleton } from './ui/Skeleton'
export { ModelPill } from './ui/ModelPill'
export { ToastViewport } from './ui/Toast'
export { showToast } from './model/toastStore'
```

- [ ] **Step 8: Верификация**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 ошибок.

- [ ] **Step 9: Commit**

```bash
git add src/shared && git commit -m "(feat): shared UI primitives, model pill, toast store"
```

---

## Task 8: UI-атомы фичи — StatusBadge, ProgressBar, TaskTypeIcon, TaskMeta, TaskActions

**Files:**
- Create: `src/features/generation-queue/ui/StatusBadge.tsx`, `ProgressBar.tsx`, `TaskTypeIcon.tsx`, `TaskMeta.tsx`, `TaskActions.tsx`

**Interfaces:**
- Consumes: `TaskStatus`, `GenType`, `GenerationTask`; `Badge`, `IconButton`, `ModelPill`, `cn`; `formatEta`, `formatCredits`, `selectQueuePosition`.
- Produces:
  - `<StatusBadge status />`
  - `<ProgressBar value />`
  - `<TaskTypeIcon type />`
  - `<TaskMeta task position? />`
  - `<TaskActions task onCancel onRetry onDownload onRemove />`

- [ ] **Step 1: `StatusBadge.tsx`**

```tsx
import type { TaskStatus } from '@/entities/generation-task'
import { Badge } from '@/shared'

const CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  queued: { label: 'В очереди', className: 'bg-secondary text-status-queued' },
  running: { label: 'Идёт', className: 'bg-primary/15 text-status-running' },
  done: { label: 'Готово', className: 'bg-status-done/15 text-status-done' },
  failed: { label: 'Ошибка', className: 'bg-destructive/15 text-status-failed' },
  canceled: { label: 'Отменено', className: 'bg-secondary/60 text-status-canceled' },
}

/** Цветной статусный бейдж. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = CONFIG[status]
  return <Badge className={className}>{label}</Badge>
}
```

- [ ] **Step 2: `ProgressBar.tsx`**

```tsx
import { motion } from 'framer-motion'
import { cn } from '@/shared'

/** Тонкий прогресс-бар (оранжевый), плавно растёт. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-pill bg-secondary', className)}>
      <motion.div
        className="h-full rounded-pill bg-primary"
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ ease: 'linear', duration: 0.4 }}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
```

- [ ] **Step 3: `TaskTypeIcon.tsx`** (lucide + плейсхолдер для image/video)

```tsx
import { FileText, Image as ImageIcon, Music, Video } from 'lucide-react'
import type { GenType } from '@/entities/generation-task'
import { cn } from '@/shared'

const ICONS: Record<GenType, typeof FileText> = {
  text: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
}

/** Иконка типа в скруглённом квадрате (для image/video — заглушка-плейсхолдер). */
export function TaskTypeIcon({ type, className }: { type: GenType; className?: string }) {
  const Icon = ICONS[type]
  return (
    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary', className)}>
      <Icon size={18} aria-hidden />
    </div>
  )
}
```

- [ ] **Step 4: `TaskMeta.tsx`**

```tsx
import type { GenerationTask } from '@/entities/generation-task'
import { ModelPill } from '@/shared'
import { formatCredits, formatEta } from '@/features/generation-queue/lib/formatEta'

/** Строка меты: model-pill + ETA/кредиты/позиция или текст ошибки. */
export function TaskMeta({ task, position }: { task: GenerationTask; position?: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <ModelPill model={task.model} />
      {task.status === 'failed' && task.error ? (
        <span className="text-status-failed">{task.error}</span>
      ) : task.status === 'canceled' ? (
        <span>{task.error ?? 'Отменено пользователем'}</span>
      ) : task.status === 'queued' && position ? (
        <span>· позиция {position} в очереди · {formatCredits(task.credits)}</span>
      ) : (
        <span>· {formatEta(task)} · {formatCredits(task.credits)}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 5: `TaskActions.tsx`**

```tsx
import { useState } from 'react'
import { Download, MoreHorizontal, RotateCw, Trash2, X } from 'lucide-react'
import type { GenerationTask } from '@/entities/generation-task'
import { IconButton, cn } from '@/shared'

interface TaskActionsProps {
  task: GenerationTask
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onDownload: (id: string) => void
  onRemove: (id: string) => void
}

/** Набор действий по статусу + меню «…» (минимум «Удалить»). */
export function TaskActions({ task, onCancel, onRetry, onDownload, onRemove }: TaskActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isActive = task.status === 'running' || task.status === 'queued'
  const isRetryable = task.status === 'failed' || task.status === 'canceled'

  return (
    <div className="relative flex items-center gap-1.5">
      {isActive && (
        <IconButton label="Отменить" onClick={() => onCancel(task.id)}>
          <X size={16} />
        </IconButton>
      )}
      {isRetryable && (
        <IconButton label="Повторить" onClick={() => onRetry(task.id)}>
          <RotateCw size={16} />
        </IconButton>
      )}
      {task.status === 'done' && (
        <IconButton label="Скачать" onClick={() => onDownload(task.id)}>
          <Download size={16} />
        </IconButton>
      )}
      <IconButton label="Ещё" onClick={() => setMenuOpen((v) => !v)}>
        <MoreHorizontal size={16} />
      </IconButton>
      {menuOpen && (
        <div
          className={cn(
            'absolute right-0 top-9 z-10 min-w-32 rounded-xl border border-border bg-card p-1 shadow-lg',
          )}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-status-failed hover:bg-secondary/50"
            onClick={() => {
              setMenuOpen(false)
              onRemove(task.id)
            }}
          >
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Верификация**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 ошибок.

- [ ] **Step 7: Commit**

```bash
git add src/features/generation-queue/ui/StatusBadge.tsx src/features/generation-queue/ui/ProgressBar.tsx src/features/generation-queue/ui/TaskTypeIcon.tsx src/features/generation-queue/ui/TaskMeta.tsx src/features/generation-queue/ui/TaskActions.tsx && git commit -m "(feat): task UI atoms — badge, progress, icon, meta, actions"
```

---

## Task 9: TaskRow, TaskCard, QueueStats, QueueToolbar, состояния экрана

**Files:**
- Create: `src/features/generation-queue/ui/TaskRow.tsx`, `TaskCard.tsx`, `QueueStats.tsx`, `QueueToolbar.tsx`, `ui/states/EmptyState.tsx`, `ui/states/LoadingState.tsx`, `ui/states/ErrorState.tsx`

**Interfaces:**
- Consumes: атомы из Task 8; `GenerationTask`, `QueueCounts`, фильтры; `Card`, `Chip`, `Button`, `Input`, `Skeleton`, `useDebouncedValue`.
- Produces:
  - `<TaskRow task position actions />`, `<TaskCard task position actions />` (общий проп `actions: { onCancel,onRetry,onDownload,onRemove }`)
  - `<QueueStats counts />`
  - `<QueueToolbar filters onStatus onSort onSearch />`
  - `<EmptyState variant='empty'|'no-results' />`, `<LoadingState />`, `<ErrorState onRetry />`

- [ ] **Step 1: `TaskRow.tsx`** (desktop/tablet)

```tsx
import type { GenerationTask } from '@/entities/generation-task'
import { Card } from '@/shared'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { TaskTypeIcon } from './TaskTypeIcon'
import { TaskMeta } from './TaskMeta'
import { TaskActions } from './TaskActions'
import { formatPercent } from '@/features/generation-queue/lib/formatEta'

export interface RowActions {
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onDownload: (id: string) => void
  onRemove: (id: string) => void
}

/** Строка задачи для desktop/tablet. */
export function TaskRow({ task, position, actions }: { task: GenerationTask; position: number | null; actions: RowActions }) {
  return (
    <Card className="flex items-center gap-4 px-4 py-3">
      <TaskTypeIcon type={task.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{task.prompt}</p>
        <TaskMeta task={task} position={position} />
        {task.status === 'running' && <ProgressBar value={task.progress} className="mt-2" />}
      </div>
      {task.status === 'running' && (
        <span className="w-12 text-right font-mono text-sm text-foreground">{formatPercent(task.progress)}</span>
      )}
      <StatusBadge status={task.status} />
      <TaskActions task={task} {...actions} />
    </Card>
  )
}
```

- [ ] **Step 2: `TaskCard.tsx`** (mobile)

```tsx
import type { GenerationTask } from '@/entities/generation-task'
import { Card } from '@/shared'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { TaskTypeIcon } from './TaskTypeIcon'
import { TaskMeta } from './TaskMeta'
import { TaskActions } from './TaskActions'
import type { RowActions } from './TaskRow'
import { formatPercent } from '@/features/generation-queue/lib/formatEta'

/** Карточка задачи для mobile. */
export function TaskCard({ task, position, actions }: { task: GenerationTask; position: number | null; actions: RowActions }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <TaskTypeIcon type={task.type} />
        <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{task.prompt}</p>
        <StatusBadge status={task.status} />
      </div>
      <TaskMeta task={task} position={position} />
      {task.status === 'running' && (
        <div className="flex items-center gap-3">
          <ProgressBar value={task.progress} />
          <span className="w-10 shrink-0 text-right font-mono text-sm">{formatPercent(task.progress)}</span>
        </div>
      )}
      <div className="flex justify-end">
        <TaskActions task={task} {...actions} />
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: `QueueStats.tsx`**

```tsx
import type { QueueCounts } from '@/features/generation-queue/model/selectors'
import { Card } from '@/shared'

const ITEMS: { key: keyof QueueCounts; label: string; dot: string }[] = [
  { key: 'queued', label: 'В очереди', dot: 'bg-status-queued' },
  { key: 'running', label: 'Идёт', dot: 'bg-status-running' },
  { key: 'done', label: 'Готово', dot: 'bg-status-done' },
  { key: 'failed', label: 'Ошибка', dot: 'bg-status-failed' },
]

/** Сводка из 4 реактивных счётчиков (mobile — 2×2). */
export function QueueStats({ counts }: { counts: QueueCounts }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map((it) => (
        <Card key={it.key} className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${it.dot}`} aria-hidden />
            {it.label}
          </div>
          <p className="mt-2 font-mono text-2xl text-foreground">{counts[it.key]}</p>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: `QueueToolbar.tsx`** (чипы + сортировка + поиск с debounce)

```tsx
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
```

- [ ] **Step 5: `states/EmptyState.tsx`**

```tsx
import { Inbox, SearchX } from 'lucide-react'

/** Пустое состояние: нет задач или нет результатов под фильтром. */
export function EmptyState({ variant }: { variant: 'empty' | 'no-results' }) {
  const isEmpty = variant === 'empty'
  const Icon = isEmpty ? Inbox : SearchX
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon size={40} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">
        {isEmpty ? 'Очередь пуста' : 'Ничего не найдено'}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {isEmpty ? 'Новые задачи генерации появятся здесь.' : 'Измените фильтры или поисковый запрос.'}
      </p>
    </div>
  )
}
```

- [ ] **Step 6: `states/LoadingState.tsx`**

```tsx
import { Skeleton } from '@/shared'

/** Скелетоны на время первичной загрузки. */
export function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: `states/ErrorState.tsx`**

```tsx
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared'

/** Состояние ошибки загрузки с кнопкой повтора. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border py-16 text-center">
      <AlertTriangle size={40} className="text-status-failed" aria-hidden />
      <p className="text-sm font-medium text-foreground">Не удалось загрузить очередь</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Повторить</Button>
    </div>
  )
}
```

- [ ] **Step 8: Верификация**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 ошибок.

- [ ] **Step 9: Commit**

```bash
git add src/features/generation-queue/ui/TaskRow.tsx src/features/generation-queue/ui/TaskCard.tsx src/features/generation-queue/ui/QueueStats.tsx src/features/generation-queue/ui/QueueToolbar.tsx src/features/generation-queue/ui/states && git commit -m "(feat): task row/card, stats, toolbar, screen states"
```

---

## Task 10: Виртуализированный список (`TaskList.tsx`)

**Files:**
- Create: `src/features/generation-queue/ui/TaskList.tsx`

**Interfaces:**
- Consumes: `useVirtualizer` (`@tanstack/react-virtual`); `useMediaQuery`; `TaskRow`/`TaskCard`/`RowActions`; `GenerationTask`; `selectQueuePosition`.
- Produces: `<TaskList tasks allTasks actions />` — виртуализированный скролл-контейнер; на mobile рендерит `TaskCard`, иначе `TaskRow`. `position` берётся из `selectQueuePosition(allTasks, id)`.

- [ ] **Step 1: Реализация**

```tsx
import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { GenerationTask } from '@/entities/generation-task'
import { useMediaQuery } from '@/shared'
import { selectQueuePosition } from '@/features/generation-queue/model/selectors'
import { TaskRow, type RowActions } from './TaskRow'
import { TaskCard } from './TaskCard'

interface TaskListProps {
  /** Отфильтрованные/отсортированные видимые задачи. */
  tasks: GenerationTask[]
  /** Полный список — для расчёта позиции в очереди. */
  allTasks: GenerationTask[]
  actions: RowActions
}

/** Виртуализированный список задач (row на desktop/tablet, card на mobile). */
export function TaskList({ tasks, allTasks, actions }: TaskListProps) {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? 168 : 80),
    overscan: 8,
    getItemKey: (i) => tasks[i].id,
  })

  return (
    <div ref={parentRef} className="max-h-[calc(100vh-320px)] overflow-y-auto [scrollbar-width:thin]">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        <AnimatePresence initial={false}>
          {virtualizer.getVirtualItems().map((vi) => {
            const task = tasks[vi.index]
            const position = selectQueuePosition(allTasks, task.id)
            return (
              <motion.div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                className="pb-3"
              >
                {isMobile ? (
                  <TaskCard task={task} position={position} actions={actions} />
                ) : (
                  <TaskRow task={task} position={position} actions={actions} />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Верификация**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/features/generation-queue/ui/TaskList.tsx && git commit -m "(feat): virtualized task list with dynamic measurement"
```

---

## Task 11: Статус-бар + публичный API фичи (`StatusBar.tsx`, `index.ts`)

**Files:**
- Create: `src/features/generation-queue/ui/StatusBar.tsx`, `src/features/generation-queue/index.ts`

**Interfaces:**
- Consumes: `useQueue`; `useNavigate` (react-router); `ProgressBar`, `Button`, `Card`, `ModelPill`; `formatPercent`.
- Produces:
  - `<StatusBar />` — глобальный индикатор: скрыт при 0 активных, компакт при 1, раскрытый при ≥2.
  - `features/generation-queue/index.ts` реэкспортит публичный API: `GenerationQueueWidget`-зависимости НЕ тут (виджет в своём слайсе); экспортируем `useQueue`, `useQueueEngine`, `StatusBar`, и UI, нужный виджету (`QueueStats`, `QueueToolbar`, `TaskList`, состояния).

- [ ] **Step 1: `StatusBar.tsx`**

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useQueue } from '@/features/generation-queue/model/useQueue'
import { Card, ModelPill } from '@/shared'
import { ProgressBar } from './ProgressBar'
import { formatPercent } from '@/features/generation-queue/lib/formatEta'

/**
 * Глобальный плавающий индикатор генераций.
 * Скрыт при 0 активных; компактная карточка при 1; раскрытый виджет при ≥2.
 * Размещение: desktop/tablet — снизу-справа; mobile — полноширинная панель снизу.
 */
export function StatusBar() {
  const navigate = useNavigate()
  const { active, avgProgress } = useQueue()
  const count = active.length

  const containerCls =
    'fixed z-40 inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:p-0 sm:w-80'

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="statusbar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className={containerCls}
        >
          <Card
            className="cursor-pointer p-4 shadow-xl transition hover:border-primary/50"
            onClick={() => navigate('/queue')}
          >
            {count === 1 ? (
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <ModelPill model={active[0].model} />
                  <ProgressBar value={active[0].progress} className="mt-2" />
                </div>
                <span className="font-mono text-xs">{formatPercent(active[0].progress)}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Генерации идут · {count} активны · {formatPercent(avgProgress)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {active.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <ModelPill model={t.model} className="w-28 shrink-0 truncate" />
                      <ProgressBar value={t.progress} />
                    </div>
                  ))}
                </div>
                <button
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate('/queue')
                  }}
                >
                  Открыть очередь <ArrowRight size={14} />
                </button>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: `features/generation-queue/index.ts`**

```ts
export { useQueue } from './model/useQueue'
export { useQueueEngine } from './model/useQueueEngine'
export type { QueueCounts } from './model/selectors'
export { StatusBar } from './ui/StatusBar'
export { QueueStats } from './ui/QueueStats'
export { QueueToolbar } from './ui/QueueToolbar'
export { TaskList } from './ui/TaskList'
export type { RowActions } from './ui/TaskRow'
export { EmptyState } from './ui/states/EmptyState'
export { LoadingState } from './ui/states/LoadingState'
export { ErrorState } from './ui/states/ErrorState'
```

- [ ] **Step 3: Верификация**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/features/generation-queue/ui/StatusBar.tsx src/features/generation-queue/index.ts && git commit -m "(feat): global status bar + feature public API"
```

---

## Task 12: Виджет, страницы, роутинг, сборка приложения

**Files:**
- Create: `src/widgets/generation-queue/ui/GenerationQueue.tsx`, `src/widgets/generation-queue/index.ts`, `src/pages/QueuePage.tsx`, `src/pages/ChatPage.tsx`, `src/app/layouts/RootLayout.tsx`, `src/app/providers/router.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: публичный API фичи; `showToast`; react-router (`createBrowserRouter`, `RouterProvider`, `Outlet`, `Navigate`).
- Produces: рабочее приложение с `/queue`, `/chat`, redirect `/` → `/queue`, глобальным статус-баром и тостами.

- [ ] **Step 1: `widgets/generation-queue/ui/GenerationQueue.tsx`** (композиция экрана + Undo)

```tsx
import { Trash2 } from 'lucide-react'
import {
  useQueue,
  QueueStats,
  QueueToolbar,
  TaskList,
  EmptyState,
  LoadingState,
  ErrorState,
  type RowActions,
} from '@/features/generation-queue'
import { Button, showToast } from '@/shared'

/** Композиция экрана очереди: шапка + сводка + тулбар + список/состояния. */
export function GenerationQueue() {
  const { tasks, visibleTasks, counts, loadStatus, filters, actions } = useQueue()

  const rowActions: RowActions = {
    onCancel: actions.cancel,
    onRetry: actions.retry,
    onDownload: () => showToast({ message: 'Скачивание (заглушка) начато' }),
    onRemove: (id) => {
      const snapshot = tasks
      actions.remove(id)
      showToast({ message: 'Задача удалена', actionLabel: 'Отменить', onAction: () => actions.restore(snapshot) })
    },
  }

  const onClearDone = () => {
    if (counts.done === 0) return
    const snapshot = tasks
    actions.clearDone()
    showToast({
      message: `Удалено готовых: ${counts.done}`,
      actionLabel: 'Отменить',
      onAction: () => actions.restore(snapshot),
    })
  }

  const renderBody = () => {
    if (loadStatus === 'loading' || loadStatus === 'idle') return <LoadingState />
    if (loadStatus === 'error') return <ErrorState onRetry={() => actions.initLoad(Date.now())} />
    if (tasks.length === 0) return <EmptyState variant="empty" />
    if (visibleTasks.length === 0) return <EmptyState variant="no-results" />
    return <TaskList tasks={visibleTasks} allTasks={tasks} actions={rowActions} />
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Очередь генераций</h1>
          <p className="text-sm text-muted-foreground">Все ваши задачи в реальном времени</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClearDone} disabled={counts.done === 0}>
          <Trash2 size={14} /> Очистить готовые
        </Button>
      </header>

      <QueueStats counts={counts} />

      <QueueToolbar
        statusFilter={filters.statusFilter}
        sort={filters.sort}
        onStatus={actions.setStatusFilter}
        onSort={actions.setSort}
        onSearch={actions.setSearch}
      />

      {renderBody()}
    </div>
  )
}
```

- [ ] **Step 2: `widgets/generation-queue/index.ts`**

```ts
export { GenerationQueue } from './ui/GenerationQueue'
```

- [ ] **Step 3: `pages/QueuePage.tsx`**

```tsx
import { GenerationQueue } from '@/widgets/generation-queue'

/** Тонкая страница очереди. */
export function QueuePage() {
  return <GenerationQueue />
}
```

- [ ] **Step 4: `pages/ChatPage.tsx`** (фон-заглушка)

```tsx
/** Заглушка экрана чата — только фон для демонстрации статус-бара. */
export function ChatPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">Чат</h1>
      <p className="text-sm text-muted-foreground">
        Экран-заглушка. Статус-бар генераций виден поверх любого экрана, пока есть активные задачи.
      </p>
    </div>
  )
}
```

- [ ] **Step 5: `app/layouts/RootLayout.tsx`**

```tsx
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQueueEngine, StatusBar } from '@/features/generation-queue'
import { ToastViewport, cn } from '@/shared'

/** Корневой layout: топбар-навигация + контент + глобальные статус-бар и тосты. Здесь стартует движок. */
export function RootLayout() {
  useQueueEngine()
  const { pathname } = useLocation()
  const link = (to: string) => cn('text-sm', pathname === to ? 'text-primary' : 'text-muted-foreground hover:text-foreground')
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b border-border px-4 py-3">
        <span className="font-mono font-semibold text-primary">era2.ai</span>
        <Link to="/queue" className={link('/queue')}>Очередь</Link>
        <Link to="/chat" className={link('/chat')}>Чат</Link>
      </nav>
      <main>
        <Outlet />
      </main>
      <StatusBar />
      <ToastViewport />
    </div>
  )
}
```

- [ ] **Step 6: `app/providers/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/app/layouts/RootLayout'
import { QueuePage } from '@/pages/QueuePage'
import { ChatPage } from '@/pages/ChatPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/queue" replace /> },
      { path: 'queue', element: <QueuePage /> },
      { path: 'chat', element: <ChatPage /> },
    ],
  },
])
```

- [ ] **Step 7: Переписать `app/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/providers/router'

/** Корневой компонент: подключает роутер. */
export function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 8: Верификация (полная, ручная)**

Run: `npx tsc --noEmit && npm run lint && npm run dev`

Проверить в браузере:
1. `/` редиректит на `/queue`; виден скелетон ~600мс, затем список.
2. Очередь «живая»: у running растёт прогресс и `%`; не более 2 running одновременно; queued добираются по FIFO; периодически появляются failed.
3. Счётчики реактивно меняются.
4. Чипы фильтруют; «Сначала новые/старые» сортирует; поиск по промпту работает с задержкой.
5. Действия: Отмена (running/queued), Повторить (failed/canceled), Скачать (done — тост), «…» → Удалить (тост с «Отменить» откатывает).
6. «Очистить готовые» удаляет done с Undo-тостом.
7. Перейти на `/chat`: статус-бар виден снизу-справа; при 1 активной — компакт, при ≥2 — раскрытый; клик/«Открыть очередь» ведёт на `/queue`.
8. Перезагрузить страницу: состояние восстановилось из localStorage; бывшие running стали queued и переподхватываются движком.
9. Уменьшить окно до mobile: карточки в стек, статистика 2×2, чипы скроллятся; статус-бар — полноширинная панель снизу.

Expected: все пункты выполняются; в консоли нет ошибок.

- [ ] **Step 9: Commit**

```bash
git add src/widgets src/pages src/app && git commit -m "(feat): widget composition, pages, routing, app assembly"
```

---

## Task 13: README + финальная вычитка

**Files:**
- Modify: `src/README.md` → заменить корневой `README.md`

**Interfaces:**
- Produces: README с запуском, описанием решений (стейт, роутинг, восстановление running→queued, шрифт-фолбэк, виртуализация), картой FSD.

- [ ] **Step 1: Переписать `README.md`**

Содержимое (Markdown): разделы «Запуск» (`npm i`, `npm run dev`), «Стек», «Архитектура (FSD)» с деревом, «Решения»:
- стейт — Zustand, единый источник правды для очереди и статус-бара;
- роутинг — react-router-dom (`/queue`, `/chat`, redirect `/`);
- персистентность — localStorage, при восстановлении `running → queued` (прогресс в 0), движок переподхватывает по слотам;
- движок — единый тикер `setInterval` 500мс, `MAX_CONCURRENT=2`, прогресс по типу, ~15% сбой, очистка на unmount;
- виртуализация — `@tanstack/react-virtual` с динамическим измерением; конфликт с framer-motion решён ограничением exit-анимаций видимым окном;
- шрифт — Geist/Geist Mono, фолбэк Inter;
- бонусы — Undo (удаление, «Очистить готовые»), framer-motion;
- токены цветов — приближение из дизайн-системы; точные значения уточняются по Figma.

- [ ] **Step 2: Финальная верификация сборки**

Run: `npm run build`
Expected: `tsc -b` и `vite build` без ошибок.

- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "(docs): README — run, architecture, decisions"
```

---

## Self-Review (выполнено при написании плана)

**Покрытие спеки:**
- §3 сетап → Task 0 ✓
- §4 токены → Task 0 (Step 4) ✓
- §5 структура → распределено по Task 1–12 ✓
- §6 модель → Task 1 ✓
- §7 автомат → Task 2 ✓
- §8 движок → Task 4 ✓
- §9 стор/персист → Task 3 ✓
- §10 селекторы → Task 5 ✓
- §11 UI + состояния + виртуализация → Task 6–10 ✓
- §12 статус-бар → Task 11 ✓
- §13 роутинг → Task 12 ✓
- §14 бонусы (Undo, framer-motion) → Task 7, 10, 11, 12 ✓
- §16 критерии → Task 12 Step 8 (ручной чек-лист) ✓

**Согласованность типов:** `RowActions` определён в `TaskRow.tsx` (Task 9), потребляется в `TaskCard`/`TaskList`/виджете; `QueueCounts` — в `selectors.ts` (Task 5), потребляется в `QueueStats`/`useQueue`; имена экшенов стора едины (`cancel/retry/remove/clearDone/restore/initLoad/setStatusFilter/setSort/setSearch`).

**Плейсхолдеры:** код приведён в каждом шаге; токены помечены как «уточнить по Figma» (значения рабочие).

**Известные допущения:** `TaskActions` меню — простое (hover/клик), без полноценного popover-фокуса (a11y-доводка — вне MVP); сбой инициализации по умолчанию выключен (`INIT_FAIL_RATE=0`), `ErrorState` проверяется через ручной триггер/временное значение.
