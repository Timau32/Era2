# ERA2 — Очередь генераций

Экран «Очередь генераций» с мок-движком обработки задач: задачи проходят
жизненный цикл `queued → running → done | failed | canceled`, ограничение
параллелизма, прогресс по времени, эмуляция загрузки и сбоев, виртуализация
списка и глобальный статус-бар. React 19 + TypeScript (strict) + Vite, Tailwind
v4, Feature-Sliced Design.

## Запуск

```bash
npm i
npm run dev      # http://localhost:5173
```

Прочие команды:

```bash
npm run build    # tsc -b && vite build (production-сборка)
npm run preview  # предпросмотр собранной сборки
npm run lint     # eslint
```

## Стек

- **React 19** + **TypeScript** (strict)
- **Vite 8** — сборка и dev-сервер
- **Tailwind CSS v4** (`@tailwindcss/vite`), токены через `@theme`
- **Zustand 5** (`persist`) — состояние очереди
- **react-router-dom 7** — роутинг
- **@tanstack/react-virtual** — виртуализация списка
- **framer-motion** — анимации появления/удаления
- **lucide-react** — иконки
- **@fontsource-variable/geist** + **geist-mono** — шрифты

## Архитектура (FSD)

Однонаправленный поток зависимостей: `app → pages → widgets → features →
entities → shared`. Псевдоним `@/` указывает на `src/`.

```
src/
├── app/                          # композиция приложения
│   ├── App.tsx
│   ├── layouts/RootLayout.tsx    # каркас + глобальный статус-бар
│   └── providers/router.tsx      # createBrowserRouter
├── pages/
│   ├── QueuePage.tsx             # /queue
│   └── ChatPage.tsx              # /chat (фон-заглушка для статус-бара)
├── widgets/
│   └── generation-queue/         # сборка экрана очереди (toolbar + list + toasts)
├── features/
│   └── generation-queue/
│       ├── model/
│       │   ├── queueStore.ts     # Zustand store (источник правды) + persist
│       │   ├── queueEngine.ts    # чистый tick() + интервальный движок
│       │   ├── useQueueEngine.ts # запуск движка на время жизни экрана
│       │   ├── transitions.ts    # переходы статусов (конечный автомат)
│       │   ├── selectors.ts      # фильтрация/сортировка/счётчики/позиция
│       │   ├── useQueue.ts       # фасад для UI
│       │   └── constants.ts      # MAX_CONCURRENT, TICK_MS, FAIL_RATE, ...
│       ├── lib/formatEta.ts
│       └── ui/                   # ProgressBar, StatusBadge, TaskRow/Card,
│                                 # TaskList (virtual), StatusBar, states/...
├── entities/
│   └── generation-task/          # тип GenerationTask, статусы, сид-данные
└── shared/                       # ui-кит, lib (cn, useDebouncedValue,
                                  # useMediaQuery), toastStore
```

## Решения

### Состояние
Единый Zustand-store `features/generation-queue/model/queueStore.ts` —
единственный источник правды. Из него питаются и экран очереди, и глобальный
статус-бар (через селекторы), поэтому данные всегда согласованы между ними.

### Роутинг
`react-router-dom` (`createBrowserRouter`): `/queue` — экран очереди,
`/chat` — заглушка-фон (чтобы показать, что статус-бар глобальный и виден на
другом экране), `/` редиректит на `/queue`.

### Персистентность
`localStorage` через `zustand/persist`, ключ **`era2-queue`**. `partialize`
сохраняет только данные и предпочтения — `tasks`, `statusFilter`, `typeFilter`,
`sort` (не `loadStatus` и не `search`). При регидрации (`onRehydrateStorage`)
все `running`-задачи переводятся в `queued` со сбросом прогресса в `0` — так
движок корректно переподхватывает их по свободным слотам после перезагрузки.

### Движок
Единый тикер на одном `setInterval` (`TICK_MS = 500мс`). Чистая функция
`tick()` за такт: продвигает прогресс `running`, завершает/роняет задачи и
добирает `queued` по свободным слотам (`MAX_CONCURRENT = 2`, добор по
`createdAt`). Скорость прогресса зависит от `durationMs` задачи — длинные типы
(видео/аудио) идут медленнее, плюс случайный разброс шага. Сбой с вероятностью
`FAIL_RATE = 0.15` за такт. Интервал гарантированно очищается на unmount
(`useQueueEngine`).

### Загрузка и ошибки
Первичная загрузка эмулируется задержкой `LOAD_DELAY_MS = 600мс`. С
вероятностью `INIT_FAIL_RATE = 0.2` инициализация падает в `ErrorState`;
кнопка «Повторить» повторно запускает `initLoad`.

### Виртуализация
`@tanstack/react-virtual` с динамическим измерением строк
(`measureElement`). Конфликт виртуализации с exit-анимациями `framer-motion`
решён ограничением `AnimatePresence` видимым окном — анимируются только строки
в зоне видимости, без рассинхрона измерений.

### Шрифты
Geist / Geist Mono (`@fontsource-variable`), фолбэк — Inter / system-ui.

### Бонусы
- **Undo** через тосты: удаление задачи и «Очистить готовые» обратимы по
  кнопке «Отменить» (снимок задач восстанавливается через `restore`).
- Анимации появления/удаления на `framer-motion`.

### Дизайн-токены
Приближены по скриншоту Foundations (точные значения Figma — после получения
доступа на чтение). Акцент `#E85420`, тёмная тема «warm-coal».
