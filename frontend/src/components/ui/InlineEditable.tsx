import { useState, useEffect, useRef, ReactNode, KeyboardEvent } from 'react';

// Base input styling (matching FormField)
const baseInputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

interface InlineEditableTextProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  isLoading?: boolean;
  renderDisplay?: (value: string, onClick: () => void) => ReactNode;
}

/**
 * Inline editable text input that saves on blur
 */
export function InlineEditableText({
  value,
  onSave,
  placeholder = 'Click to edit...',
  className = '',
  inputClassName = '',
  displayClassName = '',
  isLoading = false,
  renderDisplay,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    if (!isLoading) {
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${baseInputClass} ${inputClassName} ${className}`}
        disabled={isLoading}
      />
    );
  }

  if (renderDisplay) {
    return <>{renderDisplay(value, handleClick)}</>;
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-2 py-1 -mx-2 rounded-lg transition-colors ${displayClassName} ${className}`}
    >
      {value || <span className="text-gray-500 italic">{placeholder}</span>}
    </div>
  );
}

interface InlineEditableTextareaProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  isLoading?: boolean;
  cardStyle?: boolean;
}

/**
 * Inline editable textarea with card-style display
 */
export function InlineEditableTextarea({
  value,
  onSave,
  placeholder = 'Click to add description...',
  rows = 4,
  className = '',
  isLoading = false,
  cardStyle = true,
}: InlineEditableTextareaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const handleClick = () => {
    if (!isLoading) {
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <div className={`space-y-3 ${className}`}>
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          rows={rows}
          className={`${baseInputClass} resize-none`}
          placeholder={placeholder}
          disabled={isLoading}
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (cardStyle) {
    return (
      <div
        onClick={handleClick}
        className={`p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[100px] flex items-center transition-colors ${className}`}
      >
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {value || <span className="text-gray-500 italic">{placeholder}</span>}
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 p-2 -m-2 rounded-lg transition-colors ${className}`}
    >
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {value || <span className="text-gray-500 italic">{placeholder}</span>}
      </p>
    </div>
  );
}

interface InlineEditableTitleProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  titleClassName?: string;
}

/**
 * Inline editable title with large text styling
 */
export function InlineEditableTitle({
  value,
  onSave,
  placeholder = 'Enter title...',
  className = '',
  isLoading = false,
  titleClassName = 'text-3xl font-bold text-gray-900 dark:text-white',
}: InlineEditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (localValue !== value && localValue.trim()) {
      onSave(localValue);
    } else {
      setLocalValue(value);
    }
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleClick = () => {
    if (!isLoading) {
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <div className={`space-y-3 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full ${titleClassName} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700`}
          placeholder={placeholder}
          disabled={isLoading}
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <h1
      onClick={handleClick}
      className={`${titleClassName} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-2 py-1 -mx-2 rounded-lg transition-colors ${className}`}
    >
      {value || <span className="text-gray-500 italic">{placeholder}</span>}
    </h1>
  );
}

interface DebouncedInputProps {
  type?: 'text' | 'url' | 'number';
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Debounced input that saves on blur - for use in custom field editors
 */
export function DebouncedInput({
  type = 'text',
  initialValue,
  onSave,
  placeholder,
  className = '',
  disabled = false,
}: DebouncedInputProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  
  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  return (
    <input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== initialValue) {
          onSave(localValue);
        }
      }}
      placeholder={placeholder}
      className={`${baseInputClass} ${className}`}
      disabled={disabled}
    />
  );
}

interface DebouncedTextareaProps {
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

/**
 * Debounced textarea that saves on blur - for use in custom field editors
 */
export function DebouncedTextarea({
  initialValue,
  onSave,
  placeholder,
  className = '',
  disabled = false,
  rows = 3,
}: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== initialValue) {
          onSave(localValue);
        }
      }}
      placeholder={placeholder}
      className={`${baseInputClass} resize-none ${className}`}
      disabled={disabled}
      rows={rows}
    />
  );
}