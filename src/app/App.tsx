import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/providers/router'

/** Корневой компонент: подключает роутер. */
export function App() {
  return <RouterProvider router={router} />
}
