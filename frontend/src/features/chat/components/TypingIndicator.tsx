/** Animasi tiga titik saat AI sedang mengetik. */
export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 dark:border-night-700 dark:bg-night-900">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s] dark:bg-brand-400" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s] dark:bg-brand-400" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 dark:bg-brand-400" />
        </div>
      </div>
    </div>
  );
}
