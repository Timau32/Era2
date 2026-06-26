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
