/** Заглушка экрана чата — только фон для демонстрации статус-бара. */
export function ChatPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">Чат</h1>
      <p className="text-sm text-muted-foreground">
        Экран-заглушка. Статус-бар генераций виден поверх любого экрана, пока есть активные задачи.
      </p>
    </div>
  )
}
