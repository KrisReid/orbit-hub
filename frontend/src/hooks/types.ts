import { UseMutationResult } from '@tanstack/react-query';
import { MessageResponse } from '@/types';

// Entity Modal Types
export interface UseEntityModalReturn<T> {
  isOpen: boolean;
  mode: 'create' | 'edit';
  entity: T | null;
  openCreate: () => void;
  openEdit: (entity: T) => void;
  close: () => void;
}

// CRUD Hook Types
export interface UseCRUDOptions<T, CreateData, UpdateData> {
  queryKey: string[];
  listFn: () => Promise<{ items: T[] }>;
  createFn?: (data: CreateData) => Promise<T>;
  updateFn?: (id: number, data: UpdateData) => Promise<T>;
  deleteFn?: (id: number) => Promise<MessageResponse>;
  onCreateSuccess?: (data: T) => void;
  onUpdateSuccess?: (data: T) => void;
  onDeleteSuccess?: () => void;
}

export interface UseCRUDReturn<T, CreateData, UpdateData> {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  createMutation: UseMutationResult<T, Error, CreateData> | null;
  updateMutation: UseMutationResult<T, Error, { id: number; data: UpdateData }> | null;
  deleteMutation: UseMutationResult<MessageResponse, Error, number> | null;
  refetch: () => void;
}