import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../button/Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  className,
}) => {
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const showStartEllipsis = visiblePages[0] > 1;
  const showEndEllipsis = visiblePages[visiblePages.length - 1] < totalPages;

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, page: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePageClick(page);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center justify-center space-x-1", className)}
    >
      {/* First Page */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(1)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          aria-label="Go to first page"
        >
          1
        </Button>
      )}

      {/* Start Ellipsis */}
      {showStartEllipsis && (
        <div className="flex items-center px-2">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Previous Button */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(currentPage - 1)}
          onKeyDown={(e) => handleKeyDown(e, currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page Numbers */}
      {visiblePages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "primary" : "outline"}
          size="sm"
          onClick={() => handlePageClick(page)}
          onKeyDown={(e) => handleKeyDown(e, page)}
          aria-label={`Go to page ${page}`}
          aria-current={page === currentPage ? "page" : undefined}
          className={cn(
            page === currentPage && "bg-primary text-primary-foreground"
          )}
        >
          {page}
        </Button>
      ))}

      {/* Next Button */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(currentPage + 1)}
          onKeyDown={(e) => handleKeyDown(e, currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* End Ellipsis */}
      {showEndEllipsis && (
        <div className="flex items-center px-2">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Last Page */}
      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(totalPages)}
          onKeyDown={(e) => handleKeyDown(e, totalPages)}
          aria-label="Go to last page"
        >
          {totalPages}
        </Button>
      )}
    </nav>
  );
};

export { Pagination };
