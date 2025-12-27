import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
    };
    className?: string;
}

export function Table<T>({
    columns,
    data,
    keyExtractor,
    onRowClick,
    isLoading = false,
    emptyMessage = 'No data available',
    pagination,
    className,
}: TableProps<T>) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (columnKey: string) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            const aValue = (a as Record<string, unknown>)[sortColumn];
            const bValue = (b as Record<string, unknown>)[sortColumn];

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [data, sortColumn, sortDirection]);

    const alignClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <div className={clsx('overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700', className)}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
                    <thead className="bg-surface-50 dark:bg-surface-800/50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={clsx(
                                        'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400',
                                        alignClasses[column.align || 'left'],
                                        column.sortable && 'cursor-pointer hover:text-surface-700 dark:hover:text-surface-200'
                                    )}
                                    style={column.width ? { width: column.width } : undefined}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                >
                                    <div className={clsx('flex items-center gap-1', column.align === 'right' && 'justify-end', column.align === 'center' && 'justify-center')}>
                                        {column.header}
                                        {column.sortable && sortColumn === column.key && (
                                            sortDirection === 'asc' ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-surface-800 divide-y divide-surface-200 dark:divide-surface-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center">
                                    <div className="flex items-center justify-center">
                                        <svg className="animate-spin h-6 w-6 text-primary-500" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="ml-3 text-surface-500 dark:text-surface-400">Loading...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-surface-500 dark:text-surface-400">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item) => (
                                <tr
                                    key={keyExtractor(item)}
                                    className={clsx(
                                        'transition-colors',
                                        onRowClick && 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50'
                                    )}
                                    onClick={() => onRowClick?.(item)}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={clsx(
                                                'px-4 py-3 text-sm text-surface-700 dark:text-surface-300',
                                                alignClasses[column.align || 'left']
                                            )}
                                        >
                                            {column.render
                                                ? column.render(item)
                                                : String((item as Record<string, unknown>)[column.key] ?? '-')}
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
                <div className="flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700">
                    <div className="text-sm text-surface-500 dark:text-surface-400">
                        Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
                        {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-surface-700 dark:text-surface-300">
                            Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
                        </span>
                        <button
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
