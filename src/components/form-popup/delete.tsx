'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface DeleteFormProps {
  title?: string;
  message?: string;
  itemName?: string;
  itemDetails?: Array<{ label: string; value: string | number }>;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  className?: string;
  loading?: boolean;
}

const DeleteForm: React.FC<DeleteFormProps> = ({
  title = 'Delete Confirmation',
  message,
  itemName,
  itemDetails = [],
  onConfirm,
  onCancel,
  confirmButtonLabel = 'Delete',
  cancelButtonLabel = 'Cancel',
  className = '',
  loading = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-8 shadow-lg ${className}`}>
      <form onSubmit={handleSubmit}>
        {/* Warning Icon and Title */}
        <div className="flex items-start space-x-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h2>
            {message && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Item Name Display */}
        {itemName && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              You are about to delete:
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {itemName}
            </p>
          </div>
        )}

        {/* Item Details */}
        {itemDetails.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Details:
            </p>
            <div className="space-y-2">
              {itemDetails.map((detail, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    {detail.label}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium ml-4">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning Message */}
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">
            ⚠️ This action cannot be undone. Are you sure you want to proceed?
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 transition-colors duration-200 font-medium"
            disabled={loading}
          >
            {cancelButtonLabel}
          </button>

          <button
            type="submit"
            className="px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={loading}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            )}
            {confirmButtonLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeleteForm;