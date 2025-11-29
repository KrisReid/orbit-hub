interface WorkflowSelectorProps {
  workflow: string[];
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function WorkflowSelector({
  workflow,
  currentStatus,
  onStatusChange,
  isLoading = false,
  className = '',
}: WorkflowSelectorProps) {
  const currentIndex = workflow.indexOf(currentStatus);

  const getStepState = (index: number): 'completed' | 'current' | 'upcoming' => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {workflow.map((status, index) => {
        const stepState = getStepState(index);
        return (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            disabled={isLoading}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-50 ${
              stepState === 'current'
                ? 'bg-primary-50 dark:bg-primary-900/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div
              className={`h-3 w-3 rounded-full flex-shrink-0 ${
                stepState === 'completed'
                  ? 'bg-green-500'
                  : stepState === 'current'
                  ? 'bg-primary-600'
                  : 'border-2 border-gray-300 dark:border-gray-500 bg-transparent'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                stepState === 'completed'
                  ? 'text-green-600 dark:text-green-400'
                  : stepState === 'current'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {status}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Horizontal version for inline display
export function WorkflowSelectorHorizontal({
  workflow,
  currentStatus,
  onStatusChange,
  isLoading = false,
  className = '',
}: WorkflowSelectorProps) {
  const currentIndex = workflow.indexOf(currentStatus);

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {workflow.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            disabled={isLoading}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              isCurrent
                ? 'bg-primary-600 text-white'
                : isCompleted
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status}
          </button>
        );
      })}
    </div>
  );
}