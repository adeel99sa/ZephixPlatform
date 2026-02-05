import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  initialSort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  pagination?: PaginationProps;
  filterText?: string;
  onFilterChange?: (text: string) => void;
  caption?: string;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
}

type SortState = {
  column: string;
  direction: 'asc' | 'desc';
};

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  initialSort,
  onSortChange,
  pagination,
  filterText = '',
  onFilterChange: _onFilterChange,
  caption,
  className,
  loading = false,
  emptyMessage = 'No data available',
  emptyState,
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<SortState | null>(
    initialSort || null
  );

  // Filter data based on filter text
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data;
    
    return data.filter((row) =>
      columns.some((column) => {
        const value = typeof column.accessor === 'function'
          ? column.accessor(row)
          : row[column.accessor];
        return String(value).toLowerCase().includes(filterText.toLowerCase());
      })
    );
  }, [data, filterText, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState) return filteredData;

    return [...filteredData].sort((a, b) => {
      const column = columns.find((col) => col.id === sortState.column);
      if (!column) return 0;

      const aValue = typeof column.accessor === 'function'
        ? column.accessor(a)
        : a[column.accessor];
      const bValue = typeof column.accessor === 'function'
        ? column.accessor(b)
        : b[column.accessor];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortState.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortState.direction === 'asc' ? 1 : -1;

      // Convert to strings for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortState.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortState, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, pagination]);

  const handleSort = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column?.sortable) return;

    let newDirection: 'asc' | 'desc' = 'asc';
    if (sortState?.column === columnId) {
      newDirection = sortState.direction === 'asc' ? 'desc' : 'asc';
    }

    const newSortState = { column: columnId, direction: newDirection };
    setSortState(newSortState);
    onSortChange?.(columnId, newDirection);
  };

  const getSortIcon = (columnId: string) => {
    if (sortState?.column !== columnId) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortState.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  const getSortAriaLabel = (columnId: string) => {
    if (sortState?.column !== columnId) {
      return `Sort by ${columns.find(col => col.id === columnId)?.header}`;
    }
    return `Sorted by ${columns.find(col => col.id === columnId)?.header} ${sortState.direction === 'asc' ? 'ascending' : 'descending'}`;
  };

  const renderCell = (row: T, column: Column<T>) => {
    const value = typeof column.accessor === 'function'
      ? column.accessor(row)
      : row[column.accessor];
    
    return value;
  };

  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="border rounded-lg">
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full" role="table">
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    column.sortable && "cursor-pointer hover:bg-muted/70 focus:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    column.width && `w-[${column.width}]`
                  )}
                  style={{ width: column.width }}
                  tabIndex={column.sortable ? 0 : undefined}
                  onClick={() => column.sortable && handleSort(column.id)}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(column.id);
                    }
                  }}
                  aria-sort={
                    sortState?.column === column.id
                      ? sortState.direction === 'asc' ? 'ascending' : 'descending'
                      : column.sortable ? 'none' : undefined
                  }
                  aria-label={column.sortable ? getSortAriaLabel(column.id) : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && getSortIcon(column.id)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyState ?? emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className="border-t hover:bg-muted/30 focus-within:bg-muted/30"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-3 text-sm",
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right"
                      )}
                    >
                      {renderCell(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
