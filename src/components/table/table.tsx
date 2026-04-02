'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Calendar, ChevronDown, Check } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'select' | 'dateRange';
  /** If true, column participates in filters/search but is not rendered in the table. */
  hidden?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface ActionButton {
  label: string | React.ReactNode;
  onClick: (row: any) => void;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  tooltip?: string;
  shouldShow?: (row: any) => boolean;
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
  maxHeight?: string | 'none';
}

interface SearchableFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}

const SearchableFilterSelect: React.FC<SearchableFilterSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current && highlightedIndex >= 0) {
      const el = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) handleSelect(filteredOptions[highlightedIndex].value);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative min-w-[140px] ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white cursor-pointer flex items-center justify-between hover:border-blue-500 dark:hover:bg-slate-600 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-indigo-500 transition-colors"
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            placeholder={placeholder}
          />
        ) : (
          <span
            className={`flex-1 truncate text-sm ${!selectedOption ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm ${
                  index === highlightedIndex ? 'bg-blue-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                } ${option.value === value ? 'bg-blue-100 dark:bg-indigo-900/50' : ''}`}
              >
                <span className="text-gray-900 dark:text-white truncate">{option.label}</span>
                {option.value === value && <Check className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-indigo-400" />}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">No options found</div>
          )}
        </div>
      )}
    </div>
  );
};

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
  maxHeight,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRangeFilters, setDateRangeFilters] = useState<
    Record<string, { from: string; to: string }>
  >({});
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(itemsPerPage);
  const [calculatedHeight, setCalculatedHeight] = useState<string>('calc(100vh - 280px)');

  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  useEffect(() => {
    const calculateHeight = () => {
      const vh = window.innerHeight;
      if (vh >= 1024) setCalculatedHeight('calc(100vh - 280px)');
      else if (vh >= 768) setCalculatedHeight('calc(100vh - 240px)');
      else setCalculatedHeight('calc(100vh - 200px)');
    };
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  useEffect(() => {
    setPageSize(itemsPerPage);
  }, [itemsPerPage]);

  const getDisplayValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      if ('name' in value && typeof (value as any).name === 'string') return (value as any).name;
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getFilterOptions = (columnKey: string) => {
    const values = data
      .map((row) => getDisplayValue(row[columnKey]))
      .filter((v) => v);
    return [...new Set(values)].sort();
  };

  const filteredData = useMemo(() => {
    let filtered = [...data];
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
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (!filterValue) return;
      const lower = filterValue.toLowerCase();
      filtered = filtered.filter((row) => {
        const value = row[key];
        const displayValue = getDisplayValue(value);
        return displayValue.toLowerCase().includes(lower);
      });
    });
    Object.entries(dateRangeFilters).forEach(([key, dateRange]) => {
      if (dateRange.from || dateRange.to) {
        filtered = filtered.filter((row) => {
          const rowValue = row[key];
          if (typeof rowValue === 'string') {
            const rowDate = rowValue.split(' ')[0];
            if (dateRange.from && rowDate < dateRange.from) return false;
            if (dateRange.to && rowDate > dateRange.to) return false;
            return true;
          }
          if (rowValue instanceof Date) {
            const rowDateStr = rowValue.toISOString().split('T')[0];
            if (dateRange.from && rowDateStr < dateRange.from) return false;
            if (dateRange.to && rowDateStr > dateRange.to) return false;
            return true;
          }
          return true;
        });
      }
    });
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: any = getDisplayValue(a[sortColumn]);
        let bValue: any = getDisplayValue(b[sortColumn]);
        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }
        if (aValue && bValue && !isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [data, searchTerm, filters, dateRangeFilters, sortColumn, sortDirection, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, dateRangeFilters]);

  useEffect(() => {
    const calculatedTotalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(calculatedTotalPages);
    }
  }, [filteredData.length, pageSize]);

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

  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnKey]: value }));
    setCurrentPage(1);
  };

  const handleDateRangeChange = (columnKey: string, type: 'from' | 'to', value: string) => {
    setDateRangeFilters((prev) => ({
      ...prev,
      [columnKey]: {
        ...(prev[columnKey] || { from: '', to: '' }),
        [type]: value,
      },
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setDateRangeFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

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
        return `${base} bg-yellow-600 dark:yellow-700 text-white hover:bg-yellow-700 dark:hover:bg-yellow-600 focus:ring-yellow-500 dark:focus:ring-yellow-500`;
      default:
        return `${base} bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600`;
    }
  };

  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const tableMaxHeight = maxHeight || calculatedHeight;
  const showHeader = searchable || filterable || !!onCreateClick;
  const hasActiveFilters =
    searchTerm ||
    Object.values(filters).some((f) => f) ||
    Object.values(dateRangeFilters).some((dr) => dr.from || dr.to);

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg overflow-hidden flex flex-col ${className}`}
      style={{
        maxHeight: tableMaxHeight,
        ...(maxHeight === 'none' ? { height: '100%' } : {}),
      }}
    >
      {showHeader && (
        <div className="p-6 bg-gray-50 dark:bg-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {searchable && (
                <div className="relative flex-1 max-w-md min-w-[180px]">
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
              {filterable && (
                <button
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
                >
                  <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              )}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Clear filters
                </button>
              )}
            </div>
            {onCreateClick && (
              <Tooltip content={`Add a new ${createButtonLabel.toLowerCase()}`} position="bottom">
                <button
                  onClick={onCreateClick}
                  className="w-full sm:w-auto mt-3 sm:mt-0 px-6 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  {createButtonLabel}
                </button>
              </Tooltip>
            )}
          </div>

          {filterable && showFilters && (
            <div className="flex flex-wrap gap-3 mt-2">
              {columns
                .filter((col) => col.filterable)
                .map((column) => {
                  const filterType = column.filterType || 'select';

                  if (filterType === 'dateRange') {
                    const dateRange = dateRangeFilters[column.key] || { from: '', to: '' };
                    return (
                      <div
                        key={column.key}
                        className="flex items-center space-x-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2"
                      >
                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <div className="flex items-center space-x-2">
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
                            <input
                              type="date"
                              value={dateRange.from}
                              onChange={(e) => handleDateRangeChange(column.key, 'from', e.target.value)}
                              className="border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
                            <input
                              type="date"
                              value={dateRange.to}
                              onChange={(e) => handleDateRangeChange(column.key, 'to', e.target.value)}
                              className="border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={column.key} className="flex items-center">
                      <SearchableFilterSelect
                        value={filters[column.key] || ''}
                        onChange={(value) => handleFilterChange(column.key, value)}
                        options={getFilterOptions(column.key).map((opt) => ({ value: opt, label: opt }))}
                        placeholder={column.label}
                        className="flex-shrink-0"
                      />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="hidden md:flex-1 md:flex md:flex-col md:min-h-0">
          <div
            className="overflow-x-auto overflow-y-auto flex-1 min-h-0"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
            }}
          >
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-y border-gray-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      onClick={() => handleSort(column.key)}
                      className={`px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                        column.sortable
                          ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600'
                          : ''
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <div className="flex-col ml-1">
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-50 dark:bg-slate-700">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + (actions.length > 0 ? 1 : 0)}
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
                      colSpan={visibleColumns.length + (actions.length > 0 ? 1 : 0)}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => {
                    const visibleActions = actions.filter(
                      (action) => !action.shouldShow || action.shouldShow(row)
                    );
                    return (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                          getRowClassName ? getRowClassName(row) : ''
                        }`}
                      >
                        {visibleColumns.map((column) => (
                          <td
                            key={column.key}
                            className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap"
                          >
                            {column.render
                              ? column.render(row[column.key], row)
                              : row[column.key]}
                          </td>
                        ))}
                        {visibleActions.length > 0 && (
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                            <div className="flex space-x-2">
                              {visibleActions.map((action, actionIndex) => (
                                <Tooltip
                                  key={actionIndex}
                                  content={action.tooltip || action.label?.toString() || 'Action'}
                                  position="top"
                                >
                                  <button
                                    key={actionIndex}
                                    onClick={() => action.onClick(row)}
                                    className={action.className || getActionButtonStyles(action.variant)}
                                  >
                                    {action.icon && <span className="mr-1">{action.icon}</span>}
                                    {action.label}
                                  </button>
                                </Tooltip>
                              ))}
                            </div>
                          </td>
                        )}
                        {visibleActions.length === 0 && actions.length > 0 && (
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap" />
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center items-center h-full py-10">
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-indigo-500" />
                <span className="ml-3 text-gray-500 dark:text-gray-400">Loading...</span>
              </div>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="flex justify-center items-center h-full py-10">
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center px-4">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-3 px-3 py-3">
              {paginatedData.map((row, index) => {
                const visibleActions = actions.filter(
                  (action) => !action.shouldShow || action.shouldShow(row)
                );
                const rowClassName = getRowClassName ? getRowClassName(row) : '';
                return (
                  <div
                    key={index}
                    className={`rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm ${rowClassName}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        {visibleColumns[0] && (
                          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {visibleColumns[0].render
                              ? visibleColumns[0].render(row[visibleColumns[0].key], row)
                              : row[visibleColumns[0].key]}
                          </div>
                        )}
                      </div>
                      {visibleActions.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {visibleActions.map((action, actionIndex) => (
                            <Tooltip
                              key={actionIndex}
                              content={action.tooltip || action.label?.toString() || 'Action'}
                              position="top"
                            >
                              <button
                                onClick={() => action.onClick(row)}
                                className={
                                  action.className ||
                                  `${getActionButtonStyles(action.variant)} !px-2 !py-1 text-[11px]`
                                }
                              >
                                {action.icon && <span className="mr-1">{action.icon}</span>}
                                {action.label}
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {visibleColumns.map((column) => (
                        <div key={column.key} className="flex text-xs text-gray-700 dark:text-gray-200">
                          <span className="w-28 flex-shrink-0 font-medium text-gray-500 dark:text-gray-400">
                            {column.label}
                          </span>
                          <span className="flex-1 ml-2 break-all">
                            {column.render
                              ? column.render(row[column.key], row)
                              : row[column.key]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            Showing {filteredData.length === 0 ? 0 : startIndex + 1} to{' '}
            {Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length} results
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousPage}
            disabled={effectiveCurrentPage === 1}
            className={`p-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              effectiveCurrentPage === 1
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
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
          <button
            onClick={handleNextPage}
            disabled={effectiveCurrentPage === totalPages}
            className={`p-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              effectiveCurrentPage === totalPages
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 ml-2 sm:ml-4">
            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 dark:border-slate-600 rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500"
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