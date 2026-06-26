import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQueueEngine, StatusBar } from '@/features/generation-queue'
import { ToastViewport, cn } from '@/shared'

/** Корневой layout: топбар-навигация + контент + глобальные статус-бар и тосты. Здесь стартует движок. */
export function RootLayout() {
  useQueueEngine()
  const { pathname } = useLocation()
  const link = (to: string) =>
    cn('text-sm', pathname === to ? 'text-primary' : 'text-muted-foreground hover:text-foreground')
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b border-border px-4 py-3">
        <span className="font-mono font-semibold text-primary">era2.ai</span>
        <Link to="/queue" className={link('/queue')}>
          Очередь
        </Link>
        <Link to="/chat" className={link('/chat')}>
          Чат
        </Link>
      </nav>
      <main>
        <Outlet />
      </main>
      <StatusBar />
      <ToastViewport />
    </div>
  )
}
