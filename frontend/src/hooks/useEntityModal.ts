import { useState, useCallback } from 'react';
import { UseEntityModalReturn } from './types';

/**
 * Hook for managing entity modal state (create/edit modes)
 * Provides a clean API for opening modals in create or edit mode
 */
export function useEntityModal<T extends { id: number }>(): UseEntityModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [entity, setEntity] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEntity(null);
    setMode('create');
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((entityToEdit: T) => {
    setEntity(entityToEdit);
    setMode('edit');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing entity to allow for close animation
    setTimeout(() => {
      setEntity(null);
      setMode('create');
    }, 200);
  }, []);

  return {
    isOpen,
    mode,
    entity,
    openCreate,
    openEdit,
    close,
  };
}