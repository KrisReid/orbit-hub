import { ReactNode, useState, useRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { LucideIcon, ChevronDown, X, Check } from 'lucide-react';
import { useClickOutside } from '@/hooks';

// Table column definition
export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

// Table props
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyState?: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
  };
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/50`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-6 py-4 ${col.className || ''}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && emptyState && (
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      )}
    </div>
  );
}

// Table cell components for common patterns
interface TableCellWithIconProps {
  icon: ReactNode;
  iconBgColor?: string;
  primary: ReactNode;
  secondary?: ReactNode;
}

export function TableCellWithIcon({
  icon,
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30',
  primary,
  secondary,
}: TableCellWithIconProps) {
  return (
    <div className="flex items-center">
      <div className={`${iconBgColor} p-2 rounded-lg mr-3`}>
        {icon}
      </div>
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{primary}</div>
        {secondary && (
          <div className="text-sm text-gray-500 dark:text-gray-400">{secondary}</div>
        )}
      </div>
    </div>
  );
}

// Actions cell with consistent styling
interface TableActionsCellProps {
  children: ReactNode;
}

export function TableActionsCell({ children }: TableActionsCellProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {children}
    </div>
  );
}

// Filter bar component for tables
interface FilterOption {
  value: string | number;
  label: string;
}

interface SingleFilterConfig {
  type?: 'single';
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: FilterOption[];
  placeholder: string;
}

interface MultiFilterConfig {
  type: 'multi';
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options: FilterOption[];
  placeholder: string;
}

type FilterConfig = SingleFilterConfig | MultiFilterConfig;

interface TableFiltersProps {
  filters: FilterConfig[];
  children?: ReactNode;
  className?: string;
}

export function TableFilters({ filters, children, className = '' }: TableFiltersProps) {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {filters.map((filter, index) => (
        filter.type === 'multi' ? (
          <MultiSelectFilter
            key={index}
            value={filter.value}
            onChange={filter.onChange}
            options={filter.options}
            placeholder={filter.placeholder}
          />
        ) : (
          <select
            key={index}
            value={(filter as SingleFilterConfig).value || ''}
            onChange={(e) => (filter as SingleFilterConfig).onChange(e.target.value ? (typeof filter.options[0]?.value === 'number' ? Number(e.target.value) : e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">{filter.placeholder}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )
      ))}
      {children}
    </div>
  );
}

// Multi-select filter dropdown
interface MultiSelectFilterProps {
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options: FilterOption[];
  placeholder: string;
}

function MultiSelectFilter({ value, onChange, options, placeholder }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const toggleOption = (e: React.MouseEvent, optValue: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = value.map(v => options.find(o => o.value === v)?.label).filter(Boolean);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between min-w-[160px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <span className={value.length === 0 ? 'text-gray-500 dark:text-gray-400' : ''}>
          {value.length === 0
            ? placeholder
            : value.length === 1
              ? selectedLabels[0]
              : `${value.length} selected`}
        </span>
        <div className="flex items-center gap-1 ml-2">
          {value.length > 0 && (
            <span
              onClick={clearAll}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No options</div>
          ) : (
            options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={(e) => toggleOption(e, option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}