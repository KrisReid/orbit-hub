import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UseCRUDOptions, UseCRUDReturn } from './types';

/**
 * Hook for common CRUD operations with React Query
 * Provides standardized mutations with automatic cache invalidation
 */
export function useCRUD<T, CreateData = Partial<T>, UpdateData = Partial<T>>({
  queryKey,
  listFn,
  createFn,
  updateFn,
  deleteFn,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: UseCRUDOptions<T, CreateData, UpdateData>): UseCRUDReturn<T, CreateData, UpdateData> {
  const queryClient = useQueryClient();

  // List query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: listFn,
  });

  // Create mutation
  const createMutation = createFn
    ? useMutation({
        mutationFn: createFn,
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey });
          onCreateSuccess?.(data);
        },
      })
    : null;

  // Update mutation
  const updateMutation = updateFn
    ? useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateData }) => updateFn(id, data),
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey });
          onUpdateSuccess?.(data);
        },
      })
    : null;

  // Delete mutation
  const deleteMutation = deleteFn
    ? useMutation({
        mutationFn: deleteFn,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
          onDeleteSuccess?.();
        },
      })
    : null;

  return {
    items: data?.items ?? [],
    isLoading,
    error: error as Error | null,
    createMutation,
    updateMutation,
    deleteMutation,
    refetch,
  };
}