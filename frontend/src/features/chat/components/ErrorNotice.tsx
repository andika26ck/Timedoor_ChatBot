interface ErrorNoticeProps {
  text: string;
  onRetry?: () => void;
}

/** Notice error dengan tombol coba lagi opsional. */
export function ErrorNotice({ text, onRetry }: ErrorNoticeProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
        <span aria-hidden>⚠️</span> {text}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 font-medium text-amber-900 underline hover:no-underline dark:text-amber-100"
          >
            Coba lagi
          </button>
        )}
      </div>
    </div>
  );
}
