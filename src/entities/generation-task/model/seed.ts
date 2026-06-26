import type { GenerationTask, GenType } from './types'

/** Плановая длительность по типу: video/audio заметно дольше. */
export const DURATION_BY_TYPE: Record<GenType, number> = {
  text: 8000,
  image: 14000,
  audio: 26000,
  video: 40000,
}

/**
 * Стартовый датасет 12 задач: 2 running с прогрессом, queued, done, failed, canceled.
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
    make(11, 'audio', 'Подкаст-джингл, динамичный, 10 сек', 'Suno v4', 'done', { progress: 100, finishedAt: now - 60000, etaMs: 22000 }),
    make(12, 'text', 'Пост для Telegram-канала о запуске продукта', 'GPT-4o', 'queued'),
  ]
}
