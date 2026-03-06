'use client'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | 'ellipsis')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center gap-1 justify-center py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-2.5 py-1.5 text-xs text-[#4A5568] border border-[#D6E4FF] rounded hover:bg-[#F5F8FF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="px-2 text-[#4A5568] text-xs">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-2.5 py-1.5 text-xs rounded border transition-colors ${
              p === page
                ? 'bg-[#0052FF] text-white border-[#0052FF]'
                : 'border-[#D6E4FF] text-[#4A5568] hover:bg-[#F5F8FF]'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-2.5 py-1.5 text-xs text-[#4A5568] border border-[#D6E4FF] rounded hover:bg-[#F5F8FF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  )
}
