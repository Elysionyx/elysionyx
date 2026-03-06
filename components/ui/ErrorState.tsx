interface ErrorStateProps {
  message?: string
  retry?: () => void
}

export default function ErrorState({ message, retry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="text-[#B45309] text-sm font-medium">
        {message || 'Failed to load data.'}
      </span>
      {retry && (
        <button
          onClick={retry}
          className="text-xs text-[#4A5568] underline hover:text-[#0A0A0A] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
