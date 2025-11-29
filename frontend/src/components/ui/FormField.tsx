import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';

// Base input styling
const baseInputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

// Form field label
interface FormLabelProps {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

export function FormLabel({ children, htmlFor, required, className = '' }: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

// Text input
interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function TextInput({ label, required, error, className = '', id, ...props }: TextInputProps) {
  return (
    <div>
      {label && <FormLabel htmlFor={id} required={required}>{label}</FormLabel>}
      <input
        id={id}
        className={`${baseInputClass} ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function Textarea({ label, required, error, className = '', id, ...props }: TextareaProps) {
  return (
    <div>
      {label && <FormLabel htmlFor={id} required={required}>{label}</FormLabel>}
      <textarea
        id={id}
        className={`${baseInputClass} resize-none ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Select
interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  required?: boolean;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectInput({ 
  label, 
  required, 
  error, 
  options, 
  placeholder,
  className = '', 
  id, 
  ...props 
}: SelectInputProps) {
  return (
    <div>
      {label && <FormLabel htmlFor={id} required={required}>{label}</FormLabel>}
      <div className="relative">
        <select
          id={id}
          className={`${baseInputClass} appearance-none cursor-pointer ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Checkbox
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export function Checkbox({ label, error, className = '', id, ...props }: CheckboxProps) {
  return (
    <div>
      <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
        <input
          type="checkbox"
          id={id}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
          {...props}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// URL input with external link button
interface UrlInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  showLink?: boolean;
}

export function UrlInput({ 
  label, 
  required, 
  error, 
  showLink = true,
  value,
  className = '', 
  id, 
  ...props 
}: UrlInputProps) {
  const urlValue = typeof value === 'string' ? value : '';
  
  return (
    <div>
      {label && <FormLabel htmlFor={id} required={required}>{label}</FormLabel>}
      <div className="flex gap-2">
        <input
          type="url"
          id={id}
          value={value}
          className={`${baseInputClass} flex-1 ${error ? 'border-red-500' : ''} ${className}`}
          placeholder="https://"
          {...props}
        />
        {showLink && urlValue && (
          <a
            href={urlValue}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Multi-select (checkbox group)
interface MultiSelectProps {
  label?: string;
  required?: boolean;
  options: string[];
  value: string[];
  onChange: (values: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function MultiSelect({
  label,
  required,
  options,
  value,
  onChange,
  error,
  disabled = false,
}: MultiSelectProps) {
  const handleChange = (option: string, checked: boolean) => {
    const newValues = checked
      ? [...value, option]
      : value.filter((v) => v !== option);
    onChange(newValues);
  };

  return (
    <div>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg max-h-32 overflow-y-auto">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(opt)}
              onChange={(e) => handleChange(opt, e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Date input
interface DateInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function DateInput({ label, required, error, className = '', id, ...props }: DateInputProps) {
  return (
    <div>
      {label && <FormLabel htmlFor={id} required={required}>{label}</FormLabel>}
      <input
        type="date"
        id={id}
        className={`${baseInputClass} ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Number input
interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function NumberInput({ label, required, error, className = '', id, ...props }: NumberInputProps) {
  return (
    <div>
      {label && <FormLabel htmlFor={id} required={required}>{label}</FormLabel>}
      <input
        type="number"
        id={id}
        className={`${baseInputClass} ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Dynamic field renderer for custom fields
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'url' | 'date' | 'checkbox';

export interface CustomFieldDefinition {
  key: string;
  label: string;
  field_type: FieldType;
  required?: boolean;
  options?: string[];
  order?: number;
}

interface DynamicFieldProps {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function DynamicField({ field, value, onChange, disabled = false }: DynamicFieldProps) {
  switch (field.field_type) {
    case 'text':
      return (
        <TextInput
          label={field.label}
          required={field.required}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case 'textarea':
      return (
        <Textarea
          label={field.label}
          required={field.required}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <NumberInput
          label={field.label}
          required={field.required}
          value={value !== undefined && value !== null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled}
        />
      );
    case 'select':
      return (
        <SelectInput
          label={field.label}
          required={field.required}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value || null)}
          options={(field.options || []).map((opt) => ({ value: opt, label: opt }))}
          placeholder={`Select ${field.label.toLowerCase()}...`}
          disabled={disabled}
        />
      );
    case 'multiselect':
      return (
        <MultiSelect
          label={field.label}
          required={field.required}
          options={field.options || []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'url':
      return (
        <UrlInput
          label={field.label}
          required={field.required}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case 'date':
      return (
        <DateInput
          label={field.label}
          required={field.required}
          value={value ? String(value).split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          label={field.label}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      );
    default:
      return (
        <TextInput
          label={field.label}
          required={field.required}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

// Render a list of custom fields
interface CustomFieldsProps {
  fields: CustomFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

export function CustomFields({ fields, values, onChange, disabled = false }: CustomFieldsProps) {
  const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(value) => onChange(field.key, value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}