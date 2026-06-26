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
