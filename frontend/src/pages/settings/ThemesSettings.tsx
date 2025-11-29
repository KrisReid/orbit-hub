import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

const THEME_STATUSES_STORAGE_KEY = 'theme_workflow_statuses';
const DEFAULT_THEME_STATUSES = ['active', 'completed', 'archived'];

export function ThemesSettings() {
  const [statuses, setStatuses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(THEME_STATUSES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_THEME_STATUSES;
    } catch {
      return DEFAULT_THEME_STATUSES;
    }
  });
  const [newStatus, setNewStatus] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch all themes to check which statuses are in use
  const { data: themes } = useQuery({
    queryKey: ['themes', { include_archived: true }],
    queryFn: () => api.themes.list({ include_archived: true }),
  });

  // Calculate which statuses are in use
  const statusUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    themes?.items?.forEach((theme) => {
      const status = theme.status?.toLowerCase();
      if (status) {
        usage[status] = (usage[status] || 0) + 1;
      }
    });
    return usage;
  }, [themes]);

  // Persist statuses to localStorage
  const updateStatuses = (newStatuses: string[]) => {
    setStatuses(newStatuses);
    localStorage.setItem(THEME_STATUSES_STORAGE_KEY, JSON.stringify(newStatuses));
  };

  const handleAddStatus = () => {
    if (newStatus.trim() && !statuses.includes(newStatus.trim().toLowerCase())) {
      updateStatuses([...statuses, newStatus.trim().toLowerCase()]);
      setNewStatus('');
    }
  };

  const handleRemoveStatus = (index: number) => {
    const statusToRemove = statuses[index];
    const usageCount = statusUsage[statusToRemove] || 0;
    
    if (usageCount > 0) {
      alert(`Cannot remove "${statusToRemove}" - it is used by ${usageCount} theme(s). Change the theme status first.`);
      return;
    }
    
    if (statuses.length > 1) {
      updateStatuses(statuses.filter((_, i) => i !== index));
    }
  };

  const handleEditStatus = (index: number) => {
    setEditingIndex(index);
    setEditValue(statuses[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const newStatuses = [...statuses];
      newStatuses[editingIndex] = editValue.trim().toLowerCase();
      updateStatuses(newStatuses);
      setEditingIndex(null);
      setEditValue('');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    // Add a slight delay to show the drag preview
    setTimeout(() => {
      const target = e.target as HTMLElement;
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newStatuses = [...statuses];
    const [draggedItem] = newStatuses.splice(draggedIndex, 1);
    newStatuses.splice(dropIndex, 0, draggedItem);
    updateStatuses(newStatuses);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Themes Configuration</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Theme Statuses</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Define the lifecycle stages for strategic initiatives. Drag to reorder or add new statuses as needed.
        </p>
        
        <div className="space-y-2 mb-4">
          {statuses.map((status, index) => (
            <div
              key={`${status}-${index}`}
              draggable={editingIndex !== index}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group cursor-grab active:cursor-grabbing transition-all ${
                dragOverIndex === index
                  ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800'
                  : ''
              } ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {index + 1}
                </div>
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    onBlur={handleSaveEdit}
                    autoFocus
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                ) : (
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{status}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(statusUsage[status] || 0) > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    {statusUsage[status]} theme{statusUsage[status] > 1 ? 's' : ''}
                  </span>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  index === 0
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : index === statuses.length - 1
                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {index === 0 ? 'Default' : index === statuses.length - 1 ? 'End State' : ''}
                </span>
                <button
                  onClick={() => handleEditStatus(index)}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {statuses.length > 1 && (
                  <button
                    onClick={() => handleRemoveStatus(index)}
                    disabled={(statusUsage[status] || 0) > 0}
                    className={`p-1 transition-opacity ${
                      (statusUsage[status] || 0) > 0
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'
                        : 'text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100'
                    }`}
                    title={(statusUsage[status] || 0) > 0 ? `Cannot remove - used by ${statusUsage[status]} theme(s)` : 'Remove status'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add new status */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddStatus()}
            placeholder="Add new status..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <button
            onClick={handleAddStatus}
            disabled={!newStatus.trim()}
            className="inline-flex items-center px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> The first status is used as the default for new themes. The last status represents the end state.
            Themes can be transitioned through the workflow on the theme detail page.
          </p>
        </div>
      </div>
    </div>
  );
}