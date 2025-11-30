import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Theme } from '@/types';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Target, ExternalLink, Trash2 } from 'lucide-react';

// Constants for theme workflow statuses
const THEME_STATUSES_STORAGE_KEY = 'theme_workflow_statuses';
const DEFAULT_THEME_STATUSES = ['active', 'completed', 'archived'];

// Helper to get theme statuses from localStorage
function getThemeStatuses(): string[] {
  try {
    const saved = localStorage.getItem(THEME_STATUSES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_THEME_STATUSES;
  } catch {
    return DEFAULT_THEME_STATUSES;
  }
}
import {
  PageHeader,
  PrimaryActionButton,
  DataTable,
  TableCellWithIcon,
  TableActionsCell,
  TableFilters,
  AutoStatusBadge,
  PageLoading,
  FormModal,
  TextInput,
  Textarea,
  Checkbox,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { useEntityModal } from '@/hooks';

export function ThemesPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<{ id: number; title: string } | null>(null);

  // Get theme statuses from settings
  const themeStatuses = useMemo(() => getThemeStatuses(), []);
  const defaultStatus = themeStatuses[0] || 'active';

  // Modal state
  const modal = useEntityModal<Theme>();
  
  // Form state for modal
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: themes, isLoading } = useQuery({
    queryKey: ['themes', { include_archived: showArchived, status: filterStatus }],
    queryFn: () => api.themes.list({ include_archived: showArchived }),
  });

  const createMutation = useMutation({
    mutationFn: api.themes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      modal.close();
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.themes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      setThemeToDelete(null);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
  };

  const handleOpenCreate = () => {
    resetForm();
    modal.openCreate();
  };

  const handleSubmit = () => {
    createMutation.mutate({
      title,
      description: description || undefined,
      status: defaultStatus, // Use the first status from settings
    });
  };

  // Filter themes by status
  const filteredThemes = themes?.items?.filter(theme => {
    if (filterStatus && theme.status !== filterStatus) {
      return false;
    }
    return true;
  }) || [];

  // Table columns
  const columns: Column<Theme>[] = [
    {
      key: 'theme',
      header: 'Theme',
      render: (theme) => (
        <TableCellWithIcon
          icon={<Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          primary={
            <Link 
              to={`/themes/${theme.id}`}
              className="font-medium text-gray-900 dark:text-white hover:text-primary-600"
            >
              {theme.title}
            </Link>
          }
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (theme) => <AutoStatusBadge status={theme.status} />,
    },
    {
      key: 'description',
      header: 'Description',
      className: 'text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate',
      render: (theme) => theme.description || '—',
    },
    {
      key: 'created',
      header: 'Created',
      className: 'text-sm text-gray-500 dark:text-gray-400',
      render: (theme) => new Date(theme.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'relative',
      render: (theme) => (
        <TableActionsCell>
          <Link
            to={`/themes/${theme.id}`}
            className="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="View details"
          >
            <ExternalLink className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setThemeToDelete({ id: theme.id, title: theme.title })}
            className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Delete theme"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </TableActionsCell>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Themes"
        description="Strategic initiatives that group related projects"
        action={
          <PrimaryActionButton
            label="New Theme"
            onClick={handleOpenCreate}
          />
        }
      />

      {/* Filters */}
      <TableFilters
        filters={[
          {
            value: filterStatus,
            onChange: (v) => setFilterStatus(v as string | null),
            options: themeStatuses.map(status => ({
              value: status,
              label: status.charAt(0).toUpperCase() + status.slice(1),
            })),
            placeholder: 'All Statuses',
          },
        ]}
      >
        <Checkbox
          label="Show archived"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
      </TableFilters>

      {/* Themes Table */}
      <DataTable
        columns={columns}
        data={filteredThemes}
        keyExtractor={(theme) => theme.id}
        emptyState={{
          icon: Target,
          title: 'No themes',
          description: 'Get started by creating a new theme.',
        }}
      />

      {/* Create Modal */}
      <FormModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        onSubmit={handleSubmit}
        title="Create Theme"
        submitLabel="Create"
        loadingLabel="Creating..."
        isLoading={createMutation.isPending}
      >
        <div className="space-y-4">
          <TextInput
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Q4 Strategic Initiative"
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the strategic initiative..."
          />
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!themeToDelete}
        onClose={() => setThemeToDelete(null)}
        onConfirm={() => {
          if (themeToDelete) {
            deleteMutation.mutate(themeToDelete.id);
          }
        }}
        title="Delete Theme"
        message={`Are you sure you want to delete "${themeToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}