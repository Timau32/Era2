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
