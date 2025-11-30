import { useState, useRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, LucideIcon } from 'lucide-react';
import { useClickOutside } from '@/hooks';
import { LoadingSpinner } from './LoadingSpinner';
import { AutoStatusBadge } from './StatusBadge';

interface LinkedItem {
  id: number;
  title: string;
  status?: string;
  displayId?: string;
  href?: string;
}

interface AvailableItem {
  id: number;
  title: string;
  status?: string;
  displayId?: string;
  subtitle?: string;
}

interface LinkedItemsListProps {
  title: string;
  items: LinkedItem[];
  availableItems: AvailableItem[];
  onLink: (itemId: number) => Promise<void> | void;
  onUnlink: (itemId: number) => Promise<void> | void;
  isLoadingAvailable?: boolean;
  emptyMessage?: string;
  noAvailableMessage?: string;
  addButtonText?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  renderItem?: (item: LinkedItem, onUnlink: () => void) => ReactNode;
  className?: string;
  /** Additional action buttons to show in the header, before the link button */
  headerActions?: ReactNode;
  /** Whether to hide the count in the title */
  hideCount?: boolean;
}

/**
 * Reusable linked items list with add/remove dropdown
 * Used for Tasks in Projects, Projects in Themes, etc.
 */
export function LinkedItemsList({
  title,
  items,
  availableItems,
  onLink,
  onUnlink,
  isLoadingAvailable = false,
  emptyMessage = 'No items linked yet.',
  noAvailableMessage = 'No available items to link',
  addButtonText = 'Link Item',
  icon: Icon,
  iconColor = 'text-blue-600 dark:text-blue-400',
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30',
  renderItem,
  className = '',
  headerActions,
  hideCount = false,
}: LinkedItemsListProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setShowDropdown(false), showDropdown);

  const handleLink = async (itemId: number) => {
    await onLink(itemId);
    setShowDropdown(false);
  };

  // Determine if we should show the title section
  const showTitle = title || !hideCount;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        {showTitle && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}{!hideCount && ` (${items.length})`}
          </h2>
        )}
        {!showTitle && <div />}
        <div className="flex items-center gap-2">
          {headerActions}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              {addButtonText}
            </button>
          {showDropdown && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 max-h-64 overflow-y-auto">
              {isLoadingAvailable ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading...
                </div>
              ) : availableItems.length > 0 ? (
                <div className="py-1">
                  {availableItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleLink(item.id)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        {item.displayId && (
                          <span className="font-mono text-xs text-primary-600 dark:text-primary-400 mr-2">
                            {item.displayId}
                          </span>
                        )}
                        <span className="text-sm text-gray-900 dark:text-white">{item.title}</span>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      {item.status && <AutoStatusBadge status={item.status} />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {noAvailableMessage}
                </p>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => 
            renderItem ? (
              renderItem(item, () => onUnlink(item.id))
            ) : (
              <LinkedItemRow
                key={item.id}
                item={item}
                onUnlink={() => onUnlink(item.id)}
                icon={Icon}
                iconColor={iconColor}
                iconBgColor={iconBgColor}
              />
            )
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

interface LinkedItemRowProps {
  item: LinkedItem;
  onUnlink: () => void;
  onClick?: () => void;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

/**
 * Default row renderer for linked items
 */
export function LinkedItemRow({
  item,
  onUnlink,
  onClick,
  icon: Icon,
  iconColor = 'text-blue-600 dark:text-blue-400',
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30',
}: LinkedItemRowProps) {
  const content = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {Icon && (
        <div className={`${iconBgColor} p-2 rounded-lg flex-shrink-0`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.displayId && (
            <span className="font-mono text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
              {item.displayId}
            </span>
          )}
          <span className="text-sm text-gray-900 dark:text-white truncate">{item.title}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
    >
      {item.href ? (
        <Link to={item.href} className="flex items-center gap-3 flex-1 min-w-0" onClick={onClick}>
          {content}
        </Link>
      ) : onClick ? (
        <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          {content}
        </button>
      ) : (
        content
      )}
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.status && <AutoStatusBadge status={item.status} />}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUnlink();
          }}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface LinkedTaskRowProps {
  task: {
    id: number;
    display_id: string;
    title: string;
    status: string;
  };
  onUnlink: () => void;
  onClick?: () => void;
}

/**
 * Specialized row for linked tasks
 */
export function LinkedTaskRow({ task, onUnlink, onClick }: LinkedTaskRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
          {task.display_id}
        </span>
        <span className="text-sm text-gray-900 dark:text-white">{task.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <AutoStatusBadge status={task.status} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Unlink task"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface LinkedProjectRowProps {
  project: {
    id: number;
    title: string;
    status: string;
  };
  onUnlink: () => void;
  icon?: LucideIcon;
}

/**
 * Specialized row for linked projects
 */
export function LinkedProjectRow({ 
  project, 
  onUnlink, 
  icon: Icon 
}: LinkedProjectRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group">
      <Link
        to={`/projects/${project.id}`}
        className="flex items-center gap-3 flex-1"
      >
        {Icon && (
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{project.title}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <AutoStatusBadge status={project.status} />
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUnlink();
          }}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          title="Remove from theme"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}