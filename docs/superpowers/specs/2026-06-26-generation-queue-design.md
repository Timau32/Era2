# Спецификация: «Очередь генераций» для ERA2

> Дата: 2026-06-26
> Статус: на согласовании
> Источник требований: `../тз (1).md`, макет Figma (Foundations / Queue / Chat + Status), скриншоты в `.claude/`

## 1. Цель

Реализовать экран **«Очередь генераций»** по макету Figma с «живым» клиентским движком очереди и глобальным плавающим статус-баром генераций. Бэкенда нет — данные и асинхронность эмулируются на клиенте.

## 2. Ключевые решения (зафиксировано с заказчиком)

| Вопрос | Решение | Примечание |
|---|---|---|
| Стейт-менеджер | **Zustand** | Отход от буквальных имён `queueReducer.ts`/`QueueProvider.tsx` из ТЗ; FSD и единый источник правды сохранены |
| Роутинг | **react-router-dom** | Маршруты `/queue` и `/chat` (фон-заглушка для статус-бара) |
| Список | **Виртуализация (must-have)** через `@tanstack/react-virtual` | Переменные высоты строк/карточек → react-window недостаточно |
| Бонусы в скоупе | **Undo/Optimistic** + **framer-motion** | Юнит-тесты и светлая тема — вне скоупа MVP |
| Источник токенов | Скриншоты Figma в `.claude/` + токены из ТЗ | Figma MCP недоступен (только просмотр-доступ); пиксель-перфект не требуется |

## 3. Технический сетап

- **React 19 + TypeScript (strict)** — уже в шаблоне.
- **Vite** — добавить alias `@/` → `src/` (`vite.config.ts` + `tsconfig.app.json` `paths`).
- **Tailwind CSS v4** через `@tailwindcss/vite`; токены дизайн-системы — CSS-переменные в `@theme`.
- Зависимости: `zustand`, `react-router-dom`, `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`, `@tanstack/react-virtual`.
- Шрифты: **Geist** + **Geist Mono** (через `@fontsource-variable/geist` и `@fontsource-variable/geist-mono`), фолбэк Inter — отметить в README.

## 4. Дизайн-система (из Foundations)

Тёмная тема «warm coal». Семантические токены (shadcn-подобные) задаются CSS-переменными и пробрасываются в Tailwind `@theme`:

`background`, `foreground`, `card`, `card-foreground`, `primary` (**#E85420**), `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`.

Raw-палитра ERA2 (для тонкой настройки): `era-bg`, `era-bg-1..3`, `era-line`, `era-fg`, `era-fg-dim`, `era-fg-mute`, `era-fg-low`, `era-accent`, `era-accent-2`, `era-accent-soft`, `era-accent-hi`.

Статусные цвета:
- `queued` — нейтральный (muted/серый)
- `running` — оранжевый (primary)
- `done` — зелёный
- `failed` — красный (destructive)
- `canceled` — приглушённый

Типографика (Geist): Display/H1·H2, Heading/H3·H4, Body/Base·Small, Label/Medium, **Mono/Base** (Geist Mono — числа, модели, ETA, кредиты).

## 5. Архитектура (FSD)

`app → pages → widgets → features → entities → shared`. Импорт между слайсами только через `index.ts`, без deep-import. Alias `@/` = `src/`.

```
src/
├─ app/
│  ├─ App.tsx                  # роутер + layout + глобальный статус-бар + инициализация движка
│  └─ providers/router.tsx     # маршруты /queue, /chat, redirect / → /queue
├─ entities/
│  └─ generation-task/
│     ├─ model/
│     │  ├─ types.ts           # GenType, TaskStatus, GenerationTask
│     │  └─ seed.ts            # стартовый сид 8–12 задач
│     └─ index.ts
├─ features/
│  └─ generation-queue/
│     ├─ model/
│     │  ├─ queueStore.ts      # zustand store: state + actions (переходы автомата)
│     │  ├─ queueEngine.ts     # мок-движок: тики, слоты, таймеры, сбои
│     │  ├─ useQueueEngine.ts  # хук запуска/остановки движка (lifecycle + cleanup)
│     │  ├─ selectors.ts       # счётчики, фильтрация, сортировка, поиск (чистые функции)
│     │  ├─ persist.ts         # сериализация/гидрация localStorage
│     │  └─ useQueue.ts        # публичный хук доступа к состоянию/действиям
│     ├─ ui/
│     │  ├─ TaskRow.tsx        # строка (desktop/tablet)
│     │  ├─ TaskCard.tsx       # карточка (mobile)
│     │  ├─ StatusBadge.tsx
│     │  ├─ ProgressBar.tsx
│     │  ├─ TaskActions.tsx    # cancel / retry / download / «…»
│     │  ├─ TaskMeta.tsx       # model-pill + ETA/кредиты/позиция
│     │  ├─ TaskTypeIcon.tsx   # иконка/плейсхолдер по типу
│     │  ├─ QueueStats.tsx     # 4 счётчика
│     │  ├─ QueueToolbar.tsx   # чипы-фильтры + сортировка + поиск
│     │  ├─ StatusBar.tsx      # глобальный плавающий индикатор
│     │  └─ states/            # EmptyState / LoadingState / ErrorState
│     ├─ lib/
│     │  └─ formatEta.ts       # форматтеры времени/кредитов/процентов
│     └─ index.ts
├─ widgets/
│  └─ generation-queue/
│     ├─ ui/GenerationQueue.tsx # композиция экрана (stats + toolbar + список + состояния)
│     └─ index.ts
├─ pages/
│  ├─ QueuePage.tsx            # тонкая страница: рендерит виджет
│  └─ ChatPage.tsx             # заглушка-фон для демонстрации статус-бара
└─ shared/
   ├─ ui/                      # Button, Chip, IconButton, Badge, Card, Input, Skeleton, Toast
   └─ lib/cn.ts               # clsx + tailwind-merge
```

**Правила:** один компонент = один файл; бизнес-логика только в `features/.../model/`; компоненты «тупые» (данные + колбэки); типы домена только в `entities/generation-task/model/types.ts`.

## 6. Доменная модель (`entities/generation-task/model/types.ts`)

```ts
type GenType = 'text' | 'image' | 'video' | 'audio'
type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled'

interface GenerationTask {
  id: string
  type: GenType
  prompt: string
  model: string          // напр. "Midjourney v6", "Kling 3.0", "GPT-4o"
  status: TaskStatus
  progress: number        // 0..100
  createdAt: number       // ts — FIFO-порядок очереди
  startedAt?: number
  finishedAt?: number
  etaMs?: number          // оценка/итог длительности
  durationMs: number      // плановая длительность (зависит от типа)
  credits: number
  error?: string          // для failed
}
```

`seed.ts` — 8–12 задач: 2 running с прогрессом, несколько queued, готовые (done), ≥1 failed, ≥1 canceled. Модели и типы разнообразные (как на макете).

## 7. Конечный автомат статусов

Допустимые переходы (валидируются в экшенах стора):

```
queued   → running   (движок взял в слот)
queued   → canceled  (cancel)
running  → done       (progress = 100)
running  → failed     (случайный сбой ~15%)
running  → canceled   (cancel — немедленно, без дотиков)
failed   → queued     (retry)
canceled → queued     (retry)
done     → (удаление) (clear / delete)
любой    → (удаление) (delete)
```

## 8. Мок-движок (`queueEngine.ts`)

- **Единый тикер**: один `setInterval` (~500мс) — единый источник правды, без гонок и неконтролируемых мутаций из разных мест.
- **Лимит слотов** `MAX_CONCURRENT = 2`: если `running < 2` — берём следующую `queued` (FIFO по `createdAt`), переводим в `running`.
- **Прогресс**: у каждой `running` `progress += случайный шаг`, зависящий от `durationMs`/типа. Достиг 100 → `done`.
- **Длительность по типу**: `text`/`image` — короче, `video`/`audio` — заметно дольше (разные `durationMs`).
- **Сбои**: на тике с вероятностью ~15% задача → `failed` с варьируемым текстом («Недостаточно кредитов», «Превышено время ожидания», «Модель временно недоступна»).
- **Cancel**: немедленно убирает задачу из активных, прогресс замораживается, дотиков нет.
- **Чистка**: `useQueueEngine` останавливает интервал на unmount/остановке.

## 9. Стор (`queueStore.ts`) и персистентность

Zustand store с `persist` middleware (localStorage, ключ `era2-queue`).

**State:** `tasks: GenerationTask[]`, `loadStatus: 'loading' | 'ready' | 'error'`, UI-фильтры (`statusFilter`, `typeFilter?`, `sort`, `search`).

**Actions:** `cancel(id)`, `retry(id)`, `remove(id)`, `clearDone()`, `restore(prev)` (для Undo), `tick()` (вызывает движок), `setFilter/setSort/setSearch`, `initLoad()`.

**Загрузка (эмуляция):** `initLoad()` ставит `loading`, через ~600мс гидрирует сид/localStorage; с малой вероятностью — `error` (для демонстрации `ErrorState` + «Повторить»).

**Восстановление из localStorage:** задачи в статусе `running` при гидрации переводятся в `queued` (прогресс сбрасывается в 0), чтобы движок честно переподхватил их по слотам. Решение задокументировать в README.

**Единый источник правды:** и страница очереди, и статус-бар читают этот же стор — счётчики/прогресс всегда совпадают, дублирования нет.

## 10. Селекторы (`selectors.ts`)

Чистые функции от state:
- `selectCounts` → `{ queued, running, done, failed }` (реактивные счётчики).
- `selectVisibleTasks` → фильтр по статусу (+ по типу, бонус) → поиск по промпту → сортировка («Сначала новые / Сначала старые»; бонус — по статусу/прогрессу).
- `selectActiveTasks` → `running + queued` (для статус-бара).
- `selectAverageProgress` → усреднённый прогресс активных.

## 11. UI экрана очереди

**Шапка:** H1 «Очередь генераций» + подзаголовок «Все ваши задачи в реальном времени» + кнопка «Очистить готовые» (outline-pill справа; на mobile — адаптировать положение).

**Сводка (`QueueStats`):** 4 карты `В очереди / Идёт / Готово / Ошибка` — цветная точка-лейбл + крупное моно-число. Реактивны. Mobile — сетка 2×2.

**Тулбар (`QueueToolbar`):** чипы-фильтры `Все · В очереди · Идёт · Готово · Ошибка` (активный — оранжевый filled); сортировка «Сначала новые/старые» (дропдаун справа); **поиск по промпту с debounce** (рядом с сортировкой); место под бонус-фильтр по типу. Mobile — чипы со скроллом по горизонтали.

**Список задач:** `TaskRow` (desktop/tablet) ↔ `TaskCard` (mobile):
- иконка/плейсхолдер по типу (`TaskTypeIcon`),
- промпт (обрезка длинного текста),
- model-pill + мета (ETA/длительность/кредиты/позиция в очереди),
- `StatusBadge` нужного цвета,
- для `running` — `ProgressBar` + проценты (реалтайм),
- для `failed` — текст ошибки,
- `TaskActions` по статусу: `running`/`queued` → Отмена; `failed`/`canceled` → Повторить; `done` → Скачать (заглушка); всегда → «…» (минимум «Удалить»).

**Состояния (`states/`):** `EmptyState` (нет задач / нет результатов под фильтром — осмысленный вид); `LoadingState` (скелетоны, задержка ~600мс); `ErrorState` (кнопка «Повторить»).

**Анимации (framer-motion):** появление/удаление строк, рост прогресса, hover. С учётом `prefers-reduced-motion`.

**Виртуализация (must-have, `@tanstack/react-virtual`):** список рендерит только видимое окно — корректно работает на 1000+ задач. Динамическое измерение высот через `measureElement` (ResizeObserver), т.к. высоты строк/карточек переменные (прогресс-бар у `running`, текст ошибки у `failed`, перенос промпта на mobile). Скролл-контейнер — список задач; `QueueStats`/`QueueToolbar` остаются вне скролла (sticky-шапка списка).

**Виртуализация × framer-motion (разрешение конфликта):** виртуализатор анмаунтит строки вне вьюпорта, поэтому exit-анимации применяются только к строкам внутри видимого окна (`AnimatePresence` оборачивает отрендеренные виртуальные элементы). Enter/layout-анимации — для видимых строк; удаление вне экрана происходит без анимации. На больших списках это незаметно и не ломает измерение высот.

## 12. Глобальный статус-бар (`StatusBar.tsx`)

Часть фичи `features/generation-queue`, монтируется глобально в `app`. Читает тот же стор.

**Состояния (по числу активных = `running + queued`):**
- 0 → скрыт;
- 1 → компактная карточка: спиннер, тип/модель, мини прогресс-бар + %;
- ≥2 → раскрытый виджет: «Генерации идут · N активны · X%» (X — усреднённый прогресс), мини-список 2–3 задач + «Открыть очередь →»;
- свёрнутый (бонус) — пилюля «N генераций · X%», разворот по клику.

**Поведение:** клик/«Открыть очередь» → переход на `/queue`; плавное появление/скрытие; сглаживание прогресса (без дёрганья на каждом тике).

**Размещение:** desktop/tablet — плавающий снизу-справа (~24px); mobile — полноширинная панель снизу (safe-area).

## 13. Роутинг

`react-router-dom`: общий layout со статус-баром; `/queue` → `QueuePage`, `/chat` → `ChatPage` (простой фон-заглушка), `/` → redirect на `/queue`.

## 14. Бонусы в скоупе

- **Undo/Optimistic**: удаление и «Очистить готовые» — оптимистично + toast с откатом (`restore`).
- **framer-motion**: анимации списка и статус-бара.
- `prefers-reduced-motion` уважается.

> Примечание: виртуализация списка — **обязательна** (см. §11), а не бонус.

## 15. Вне скоупа

Реальный бэкенд/сеть/авторизация; прочие страницы продукта; старые браузеры/IE; пиксель-перфект; юнит-тесты; светлая тема; drag-to-reorder (могут быть добавлены позже).

## 16. Критерии готовности

- Экран `/queue` «живой»: задачи продвигаются по статусам, прогресс растёт, ~15% падают, лимит 2 слота соблюдается.
- Работают фильтры/сортировка/поиск; счётчики реактивны.
- Список виртуализирован (`@tanstack/react-virtual`), плавно скроллит при 1000+ задач без потери высот/анимаций видимого окна.
- Все состояния (empty/loading/error) реализованы.
- Статус-бар виден поверх `/chat`, синхронен с очередью, ведёт на `/queue`.
- Состояние переживает перезагрузку (localStorage), running→queued при восстановлении.
- Адаптив desktop/tablet/mobile не ломается.
- FSD соблюдён: импорты через `index.ts`, логика в `model/`, типы в `entities`.
- README описывает запуск, решения (роутинг, восстановление running, шрифт-фолбэк).
