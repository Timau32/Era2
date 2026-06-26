/** Максимум одновременно выполняемых задач. */
export const MAX_CONCURRENT = 2
/** Интервал тика движка, мс. */
export const TICK_MS = 500
/** Вероятность сбоя running-задачи на одном тике. */
export const FAIL_RATE = 0.15
/** Задержка эмуляции первичной загрузки, мс. */
export const LOAD_DELAY_MS = 600
/** Вероятность сбоя инициализации (для ErrorState). */
export const INIT_FAIL_RATE = 0.2
/** Варианты текста ошибки. */
export const ERROR_MESSAGES = [
  'Недостаточно кредитов',
  'Превышено время ожидания',
  'Модель временно недоступна',
] as const
