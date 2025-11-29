import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, LucideIcon } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface BreadcrumbItem {
  label: string;
  href?: string;
  dropdown?: ReactNode;
}

interface DetailPageLayoutProps {
  isLoading?: boolean;
  notFound?: boolean;
  notFoundMessage?: string;
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  title: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
}

/**
 * Shared layout for detail pages (Project, Theme, etc.)
 * Provides consistent structure with header, breadcrumbs, main content, and sidebar
 */
export function DetailPageLayout({
  isLoading = false,
  notFound = false,
  notFoundMessage = 'Not found',
  breadcrumbs,
  backHref,
  title,
  headerActions,
  children,
  sidebar,
}: DetailPageLayoutProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">{notFoundMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Breadcrumbs */}
          {(breadcrumbs || backHref) && (
            <div className="flex items-center gap-2 mb-4">
              {backHref && (
                <Link
                  to={backHref}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              )}
              {breadcrumbs?.map((crumb, index) => (
                <span key={index} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-gray-300 dark:text-gray-600">›</span>
                  )}
                  {crumb.dropdown ? (
                    crumb.dropdown
                  ) : crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          
          {/* Title */}
          {title}
        </div>
        
        {/* Header Actions */}
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      {sidebar ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {children}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {sidebar}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {children}
        </div>
      )}
    </div>
  );
}

interface ContentCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

/**
 * Content card for detail pages
 */
export function ContentCard({ title, children, className = '', headerAction }: ContentCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}

interface SidebarCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Sidebar card for detail pages
 */
export function SidebarCard({ title, children, className = '' }: SidebarCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface InfoListProps {
  items: Array<{
    label: string;
    value: ReactNode;
  }>;
  className?: string;
}

/**
 * Info list for displaying metadata in sidebars
 */
export function InfoList({ items, className = '' }: InfoListProps) {
  return (
    <dl className={`space-y-3 text-sm ${className}`}>
      {items.map((item, index) => (
        <div key={index}>
          <dt className="text-gray-500 dark:text-gray-400">{item.label}</dt>
          <dd className="text-gray-900 dark:text-white">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface DeleteButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Delete button for detail page headers
 */
export function DeleteButton({ onClick, isLoading = false, className = '' }: DeleteButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 ${className}`}
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}