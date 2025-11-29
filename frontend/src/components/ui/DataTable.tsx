import { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { LucideIcon } from 'lucide-react';

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

interface TableFiltersProps {
  filters: Array<{
    value: string | number | null;
    onChange: (value: string | number | null) => void;
    options: FilterOption[];
    placeholder: string;
  }>;
  children?: ReactNode;
  className?: string;
}

export function TableFilters({ filters, children, className = '' }: TableFiltersProps) {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {filters.map((filter, index) => (
        <select
          key={index}
          value={filter.value || ''}
          onChange={(e) => filter.onChange(e.target.value ? (typeof filter.options[0]?.value === 'number' ? Number(e.target.value) : e.target.value) : null)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="">{filter.placeholder}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
      {children}
    </div>
  );
}