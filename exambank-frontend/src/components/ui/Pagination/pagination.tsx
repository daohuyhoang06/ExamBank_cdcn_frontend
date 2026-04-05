import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button/button';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  className?: string;
};

function getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const items = getPageItems(safeCurrentPage, totalPages);

  const handlePageClick = (page: number) => {
    if (!onPageChange) {
      return;
    }

    onPageChange(page);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={safeCurrentPage <= 1}
        onClick={() => handlePageClick(safeCurrentPage - 1)}
        className="h-8 w-8 rounded-lg p-0 text-[var(--ink-600)]"
      >
        <ChevronLeft size={14} />
      </Button>

      {items.map((item, index) => {
        if (item === 'ellipsis') {
          return (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-[var(--ink-500)]">
              ...
            </span>
          );
        }

        const isActive = item === safeCurrentPage;

        return (
          <Button
            key={item}
            type="button"
            variant={isActive ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePageClick(item)}
            className={`h-8 w-8 rounded-lg p-0 text-xs font-semibold ${
              isActive ? 'text-white' : 'text-[var(--ink-700)] hover:bg-white'
            }`}
          >
            {item}
          </Button>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={safeCurrentPage >= totalPages}
        onClick={() => handlePageClick(safeCurrentPage + 1)}
        className="h-8 w-8 rounded-lg p-0 text-[var(--ink-600)]"
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
