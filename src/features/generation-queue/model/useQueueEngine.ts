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
