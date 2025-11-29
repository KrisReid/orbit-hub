import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${
        paddingClasses[padding]
      } ${hover ? 'hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer' : ''} ${
        onClick ? 'text-left w-full' : ''
      } ${className}`}
    >
      {children}
    </Component>
  );
}

// Card with header section
interface CardWithHeaderProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CardWithHeader({
  title,
  action,
  children,
  className = '',
}: CardWithHeaderProps) {
  return (
    <Card padding="none" className={className}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

// Info card with icon
interface InfoCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  href?: string;
  color?: string;
}

export function InfoCard({ icon, title, value, href, color = 'bg-primary-500' }: InfoCardProps) {
  const content = (
    <div className="flex items-center">
      <div className={`${color} rounded-lg p-3`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        <Card hover>{content}</Card>
      </a>
    );
  }

  return <Card>{content}</Card>;
}