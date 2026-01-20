'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface ActionButton {
  label: string | React.ReactNode;
  onClick: (row: any) => void;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
}

export interface TableProps {
  data: any[];
  columns: TableColumn[];
  actions?: ActionButton[];
  itemsPerPage?: number;
  searchable?: boolean;
  filterable?: boolean;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
  onCreateClick?: () => void;
  createButtonLabel?: string;
  getRowClassName?: (row: any) => string;
}

const Table: React.FC<TableProps> = ({
  data,
  columns,
  actions = [],
  itemsPerPage = 10,
  searchable = true,
  filterable = true,
  className = '',
  loading = false,
  emptyMessage = 'No data available',
  onCreateClick,
  createButtonLabel = 'Create',
  getRowClassName,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(itemsPerPage);

  // Get display value for filtering and searching (purely generic)
  const getDisplayValue = (value: any): string => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    // Basic handling for objects (you can customize per column via render in the caller)
    if (typeof value === 'object') {
      if ('name' in value && typeof (value as any).name === 'string') {
        return (value as any).name;
      }
      return JSON.stringify(value);
    }

    return String(value);
  };

  // Get unique values for filter options
  const getFilterOptions = (columnKey: string) => {
    const values = data
      .map((row) => getDisplayValue(row[columnKey]))
      .filter((v) => v);

    return [...new Set(values)].sort();
  };

  // Filter, search, sort
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Search across all columns
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((row) =>
        columns.some((column) => {
          const value = row[column.key];
          const displayValue = getDisplayValue(value);
          return displayValue.toLowerCase().includes(lower);
        })
      );
    }

    // Column filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (!filterValue) return;

      const lower = filterValue.toLowerCase();
      filtered = filtered.filter((row) => {
        const value = row[key];
        const displayValue = getDisplayValue(value);
        return displayValue.toLowerCase().includes(lower);
      });
    });

    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: any = getDisplayValue(a[sortColumn]);
        let bValue: any = getDisplayValue(b[sortColumn]);

        // Numeric sort if possible
        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, filters, sortColumn, sortDirection, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Sorting handler
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Filter change
  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
    setCurrentPage(1);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Page size
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Action button styles
  const getActionButtonStyles = (variant: string = 'primary') => {
    const base =
      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800';

    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500`;
      case 'secondary':
        return `${base} bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600`;
      case 'danger':
        return `${base} bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-500`;
      case 'warning':
        return `${base} bg-yellow-600 dark:bg-yellow-700 text-white hover:bg-yellow-700 dark:hover:bg-yellow-600 focus:ring-yellow-500 dark:focus:ring-yellow-500`;
      default:
        return `${base} bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600`;
    }
  };

  // Clamp current page if filters/search changed
  const effectiveCurrentPage = Math.min(currentPage, totalPages);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header with search, filter and create button */}
      <div className="p-6 bg-gray-50 dark:bg-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            {/* Search Bar */}
            {searchable && (
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search here..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg leading-5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500 text-sm"
                />
              </div>
            )}

            {/* Filter Icon */}
            {filterable && (
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className="p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
              >
                <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}

            {/* Clear Filters */}
            {(searchTerm || Object.values(filters).some((f) => f)) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Create Button */}
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="px-6 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
            >
              {createButtonLabel}
            </button>
          )}
        </div>

        {/* Filter Pills Row */}
        {filterable && showFilters && (
          <div className="flex flex-wrap gap-3">
            {columns
              .filter((col) => col.filterable)
              .map((column) => (
                <div key={column.key} className="flex items-center">
                  <div className="relative">
                    <select
                      value={filters[column.key] || ''}
                      onChange={(e) => handleFilterChange(column.key, e.target.value)}
                      className="appearance-none bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-full px-4 py-2 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500"
                    >
                      <option value="">{column.label}</option>
                      {getFilterOptions(column.key).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-slate-700 border-y border-gray-200 dark:border-slate-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col ml-1">
                        <svg
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-gray-900 dark:text-gray-200'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-indigo-500" />
                    <span className="ml-3 text-gray-500 dark:text-gray-400">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                    getRowClassName ? getRowClassName(row) : ''
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={() => action.onClick(row)}
                            className={action.className || getActionButtonStyles(action.variant)}
                          >
                            {action.icon && <span className="mr-1">{action.icon}</span>}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white dark:bg-slate-800 px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Showing {filteredData.length === 0 ? 0 : startIndex + 1} to{' '}
            {Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length} results
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && effectiveCurrentPage > 3) {
                pageNum = effectiveCurrentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - 4 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-md text-sm font-medium ${
                    pageNum === effectiveCurrentPage
                      ? 'bg-gray-900 dark:bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && effectiveCurrentPage < totalPages - 2 && (
              <span className="text-gray-500 dark:text-gray-400">...</span>
            )}
          </div>

          {/* Rows per page */}
          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 dark:border-slate-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Table;