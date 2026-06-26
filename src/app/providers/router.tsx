import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/app/layouts/RootLayout'
import { QueuePage } from '@/pages/QueuePage'
import { ChatPage } from '@/pages/ChatPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/queue" replace /> },
      { path: 'queue', element: <QueuePage /> },
      { path: 'chat', element: <ChatPage /> },
    ],
  },
])
