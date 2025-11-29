import { useState, useRef, ReactNode, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useClickOutside } from '@/hooks';

interface DropdownOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface DropdownProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  allowNull?: boolean;
  nullLabel?: string;
  renderTrigger?: (selected: DropdownOption<T> | null, isOpen: boolean) => ReactNode;
  renderOption?: (option: DropdownOption<T>, isSelected: boolean) => ReactNode;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function Dropdown<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  allowNull = false,
  nullLabel = 'None',
  renderTrigger,
  renderOption,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const selectedOption = options.find(opt => opt.value === value) || null;

  const handleSelect = useCallback((newValue: T | null) => {
    onChange(newValue);
    setIsOpen(false);
  }, [onChange]);

  const defaultRenderTrigger = (selected: DropdownOption<T> | null, _isOpen: boolean) => (
    <button
      type="button"
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
      className={`flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`}
    >
      {selected?.icon}
      {selected?.label || placeholder}
      <ChevronDown className="h-4 w-4" />
    </button>
  );

  const defaultRenderOption = (option: DropdownOption<T>, isSelected: boolean) => (
    <div className={`flex items-center gap-2 ${isSelected ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
      {isSelected && <span>✓</span>}
      {option.icon}
      {option.label}
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {renderTrigger ? renderTrigger(selectedOption, isOpen) : defaultRenderTrigger(selectedOption, isOpen)}
      
      {isOpen && (
        <div className={`absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1 max-h-64 overflow-y-auto ${menuClassName}`}>
          {allowNull && (
            <button
              onClick={() => handleSelect(null)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {renderOption 
                ? renderOption({ value: null as unknown as T, label: nullLabel }, value === null)
                : defaultRenderOption({ value: null as unknown as T, label: nullLabel }, value === null)
              }
            </button>
          )}
          {options.map((option) => (
            <button
              key={String(option.value)}
              onClick={() => handleSelect(option.value)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {renderOption 
                ? renderOption(option, option.value === value)
                : defaultRenderOption(option, option.value === value)
              }
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Breadcrumb-style dropdown for navigation (Theme > Project Type pattern)
interface BreadcrumbDropdownProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  allowNull?: boolean;
  nullLabel?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function BreadcrumbDropdown<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  allowNull = false,
  nullLabel = 'None',
  variant = 'secondary',
  className = '',
}: BreadcrumbDropdownProps<T>) {
  const variantClasses = {
    primary: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
    secondary: 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
  };

  return (
    <Dropdown
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      allowNull={allowNull}
      nullLabel={nullLabel}
      triggerClassName={variantClasses[variant]}
      className={className}
    />
  );
}

// Simple selector dropdown without search
interface SimpleSelectorProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: DropdownOption<T>[];
  label?: string;
  placeholder?: string;
  allowNull?: boolean;
  nullLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function SimpleSelector<T extends string | number>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select...',
  allowNull = false,
  nullLabel = 'None',
  className = '',
  disabled = false,
}: SimpleSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{selectedOption?.label || placeholder}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1 max-h-48 overflow-y-auto">
            {allowNull && (
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${value === null ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {value === null && <span className="mr-2">✓</span>}
                {nullLabel}
              </button>
            )}
            {options.map((option) => (
              <button
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${option.value === value ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {option.value === value && <span>✓</span>}
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}