'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  error,
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
    if (disabled) return;
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
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-lg flex items-center justify-between transition-colors duration-200 ${
          error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'
        } ${
          disabled
            ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed opacity-50'
            : 'bg-white dark:bg-slate-700 cursor-pointer hover:border-blue-500 dark:hover:border-indigo-500 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-indigo-500'
        }`}
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
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={placeholder}
            disabled={disabled}
          />
        ) : (
          <span
            className={`flex-1 truncate ${
              !selectedOption ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-3 cursor-pointer flex items-center justify-between ${
                  index === highlightedIndex
                    ? 'bg-blue-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                } ${option.value === value ? 'bg-blue-100 dark:bg-indigo-900/50' : ''}`}
              >
                <span className="text-gray-900 dark:text-white">{option.label}</span>
                {option.value === value && <Check className="w-4 h-4 text-blue-600 dark:text-indigo-400 flex-shrink-0" />}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">No options found</div>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default SearchableSelect;
