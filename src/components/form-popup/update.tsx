'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Upload, X, Image as ImageIcon, FileText, Plus, Minus } from 'lucide-react';
import SearchableSelect from '@/src/components/common/searchable-select';

export interface FormField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'phone'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'textarea'
    | 'date'
    | 'number'
    | 'file'
    | 'file-multiple';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: any }[];
  /** When true and type is 'select', renders a searchable dropdown instead of native select */
  searchable?: boolean;
  /** When true with searchable, allows typing a new value not in options */
  creatable?: boolean;
  validation?: (value: any) => string | null;
  disabled?: boolean;
  defaultValue?: any;
  className?: string;
  rows?: number; // for textarea
  accept?: string; // for file inputs (e.g., 'image/*', 'application/pdf')
  multiple?: boolean; // for file inputs
}

export interface UpdateFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  onClear?: () => void;
  submitButtonLabel?: string;
  clearButtonLabel?: string;
  title?: string;
  className?: string;
  loading?: boolean;
  initialData?: Record<string, any>;
  customSections?: React.ReactNode; // New prop for custom sections
}

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

const UpdateForm: React.FC<UpdateFormProps> = ({
  fields,
  onSubmit,
  onClear,
  submitButtonLabel = 'Update',
  clearButtonLabel = 'Reset',
  title,
  className = '',
  loading = false,
  initialData = {},
  customSections,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, FilePreview[]>>({});

  // Initialize form data with initialData
  useEffect(() => {
    const initData = fields.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]:
          initialData[field.name] !== undefined
            ? initialData[field.name]
            : field.defaultValue ?? (field.type === 'checkbox' ? false : field.type === 'file' || field.type === 'file-multiple' ? [] : ''),
      }),
      {}
    );

    setFormData(initData);
  }, [fields, initialData]);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required) {
      if (field.type === 'file' || field.type === 'file-multiple') {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return `${field.label} is required`;
        }
      } else if (
        !value ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        return `${field.label} is required`;
      }
    }

    if (field.validation) {
      try {
        const validationResult = field.validation(value);
        if (validationResult) {
          return validationResult;
        }
      } catch (error) {
        console.error('Validation error:', error);
        return 'Validation failed';
      }
    }

    // Built-in validations
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (field.type === 'phone' && value) {
      const phoneRegex = /^[0-9-+\s()]+$/;
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid phone number';
      }
    }

    return null;
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: '',
      }));
    }
  };

  const handleFileChange = (fieldName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const field = fields.find((f) => f.name === fieldName);
    if (!field) return;

    const fileArray = Array.from(files);
    const newPreviews: FilePreview[] = [];

    fileArray.forEach((file) => {
      const id = `${Date.now()}-${Math.random()}`;
      let preview = '';

      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newPreviews.push({ file, preview, id });
    });

    if (field.type === 'file-multiple' || field.multiple) {
      setFilePreviews((prev) => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), ...newPreviews],
      }));
      setFormData((prev) => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), ...fileArray],
      }));
    } else {
      setFilePreviews((prev) => ({
        ...prev,
        [fieldName]: newPreviews,
      }));
      setFormData((prev) => ({
        ...prev,
        [fieldName]: fileArray,
      }));
    }
  };

  const removeFile = (fieldName: string, fileId: string) => {
    setFilePreviews((prev) => {
      const updated = { ...prev };
      if (updated[fieldName]) {
        const fileToRemove = updated[fieldName].find((f) => f.id === fileId);
        if (fileToRemove && fileToRemove.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }
        updated[fieldName] = updated[fieldName].filter((f) => f.id !== fileId);
      }
      return updated;
    });

    setFormData((prev) => {
      const updated = { ...prev };
      if (Array.isArray(updated[fieldName])) {
        updated[fieldName] = updated[fieldName].filter((_, index) => {
          const previews = filePreviews[fieldName] || [];
          return previews[index]?.id !== fileId;
        });
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);

    // If no errors, submit the form
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  const handleReset = () => {
    // Clean up file previews
    Object.values(filePreviews).forEach((previewArray) => {
      previewArray.forEach((preview) => {
        if (preview.preview) {
          URL.revokeObjectURL(preview.preview);
        }
      });
    });

    const resetData = fields.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]:
          initialData[field.name] !== undefined
            ? initialData[field.name]
            : field.defaultValue ?? (field.type === 'checkbox' ? false : field.type === 'file' || field.type === 'file-multiple' ? [] : ''),
      }),
      {}
    );

    setFormData(resetData);
    setErrors({});
    setFilePreviews({});

    if (onClear) {
      onClear();
    }
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.name];
    const baseInputClasses = `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500 transition-colors duration-200 ${
      hasError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'
    } ${
      field.disabled
        ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed'
        : 'bg-white dark:bg-slate-700'
    } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`;

    switch (field.type) {
      case 'file':
      case 'file-multiple':
        return (
          <div>
            <input
              type="file"
              id={`file-${field.name}`}
              accept={field.accept}
              multiple={field.type === 'file-multiple' || field.multiple}
              onChange={(e) => handleFileChange(field.name, e.target.files)}
              className="hidden"
              disabled={field.disabled}
            />
            <label
              htmlFor={`file-${field.name}`}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                hasError
                  ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              } ${field.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {field.accept === 'image/*' ? 'PNG, JPG, GIF' : field.accept === 'application/pdf' ? 'PDF' : 'Any file'}
                </p>
              </div>
            </label>

            {/* File Previews */}
            {filePreviews[field.name] && filePreviews[field.name].length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {filePreviews[field.name].map((preview) => (
                  <div key={preview.id} className="relative group">
                    {preview.preview ? (
                      <div className="relative">
                        <img
                          src={preview.preview}
                          alt="Preview"
                          className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(field.name, preview.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {preview.file.name}
                        </p>
                      </div>
                    ) : (
                      <div className="relative border border-gray-300 dark:border-slate-600 rounded-lg p-4">
                        <FileText className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {preview.file.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeFile(field.name, preview.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'select':
        if (field.searchable && field.options && field.options.length > 0) {
          const selectOptions = field.options.map((opt) => ({
            value: String(opt.value),
            label: opt.label,
          }));
          return (
            <SearchableSelect
              value={String(formData[field.name] ?? '')}
              onChange={(val) => handleInputChange(field.name, val)}
              options={selectOptions}
              placeholder={field.placeholder || `Select ${field.label}`}
              disabled={field.disabled}
              creatable={field.creatable}
            />
          );
        }
        return (
          <div className="relative">
            <select
              value={formData[field.name] ?? ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className={`${baseInputClasses} appearance-none pr-10 ${
                !formData[field.name]
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-gray-900 dark:text-white'
              }`}
              disabled={field.disabled}
            >
              <option
                value=""
                disabled
                className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {field.placeholder || `Select ${field.label}`}
              </option>
              {field.options?.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={formData[field.name] ?? ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            className={baseInputClasses}
            disabled={field.disabled}
          />
        );

      case 'checkbox':
        return (
          <label className="inline-flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData[field.name]}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="w-5 h-5 text-blue-600 dark:text-indigo-500 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:focus:ring-indigo-500 focus:ring-2 bg-white dark:bg-slate-700"
              disabled={field.disabled}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.placeholder || field.label}
            </span>
          </label>
        );

      case 'radio':
        return (
          <div className="flex flex-wrap gap-4">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={formData[field.name] === option.value}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-4 h-4 text-blue-600 dark:text-indigo-500 border-gray-300 dark:border-slate-600 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:ring-2 bg-white dark:bg-slate-700"
                  disabled={field.disabled}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case 'password':
        return (
          <div className="relative">
            <input
              type={showPasswords[field.name] ? 'text' : 'password'}
              value={formData[field.name] ?? ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={`${baseInputClasses} pr-12`}
              disabled={field.disabled}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility(field.name)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
            >
              {showPasswords[field.name] ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={formData[field.name] ?? ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={baseInputClasses}
            disabled={field.disabled}
          />
        );

      case 'number':
        if (field.name === 'monthlyRent') {
          const current = Number(formData[field.name] ?? 0) || 0;
          return (
            <div className="relative">
              <input
                type="number"
                value={formData[field.name] ?? ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className={`${baseInputClasses} pl-10 pr-10 appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                disabled={field.disabled}
                step="any"
                min="0"
              />
              <button
                type="button"
                aria-label="Decrease monthly rent"
                onClick={() => handleInputChange(field.name, Math.max(0, current - 1))}
                disabled={field.disabled}
                className="absolute inset-y-0 left-2 flex items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Increase monthly rent"
                onClick={() => handleInputChange(field.name, current + 1)}
                disabled={field.disabled}
                className="absolute inset-y-0 right-2 flex items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <input
            type="number"
            value={formData[field.name] ?? ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClasses}
            disabled={field.disabled}
            step="any"
          />
        );

      default:
        return (
          <input
            type={field.type}
            value={formData[field.name] ?? ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClasses}
            disabled={field.disabled}
          />
        );
    }
  };

  // Separate file upload fields from regular fields
  const regularFields = fields.filter((field) => field.type !== 'file' && field.type !== 'file-multiple');
  const fileFields = fields.filter((field) => field.type === 'file' || field.type === 'file-multiple');

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-8 shadow-lg ${className}`}>
      {title && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Base fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {regularFields.map((field) => (
            <div
              key={field.name}
              className={`${field.type === 'textarea' ? 'md:col-span-2' : ''} ${
                field.className || ''
              }`}
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {field.label}
                {field.required && (
                  <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                )}
              </label>

              {renderField(field)}

              {errors[field.name] && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* File Upload Fields Section */}
        {fileFields.length > 0 && (
          <div className="mb-8 border-t border-gray-200 dark:border-slate-700 pt-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Photos & Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {fileFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                    )}
                  </label>
                  {renderField(field)}
                  {errors[field.name] && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Sections */}
        {customSections && (
          <div className="mb-8">
            {customSections}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 transition-colors duration-200 font-medium"
            disabled={loading}
          >
            {clearButtonLabel}
          </button>

          <button
            type="submit"
            className="px-6 py-3 bg-[#4154F1] dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={loading}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            )}
            {submitButtonLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateForm;