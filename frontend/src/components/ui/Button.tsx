import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
  link: 'text-primary-600 dark:text-primary-400 hover:underline p-0',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          variant !== 'link' ? sizeClasses[size] : ''
        } ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon button for actions like edit, delete
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'default' | 'danger' | 'success';
  size?: 'sm' | 'md';
  label: string; // For accessibility
}

export function IconButton({
  icon,
  variant = 'default',
  size = 'md',
  label,
  className = '',
  ...props
}: IconButtonProps) {
  const variantClasses = {
    default: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
    danger: 'text-red-400 hover:text-red-600 dark:hover:text-red-300',
    success: 'text-green-400 hover:text-green-600 dark:hover:text-green-300',
  };

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
  };

  return (
    <button
      aria-label={label}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}