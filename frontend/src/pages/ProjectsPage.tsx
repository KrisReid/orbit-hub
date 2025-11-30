import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Project, ProjectType } from '@/types';
import { FolderKanban, ExternalLink } from 'lucide-react';
import {
  PageHeader,
  PrimaryActionButton,
  DataTable,
  TableCellWithIcon,
  TableActionsCell,
  TableFilters,
  AutoStatusBadge,
  StatusBadge,
  PageLoading,
  FormModal,
  TextInput,
  Textarea,
  SelectInput,
  CustomFields,
} from '@/components/ui';
import type { Column, CustomFieldDefinition } from '@/components/ui';
import { useEntityModal } from '@/hooks';

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const modal = useEntityModal<Project>();
  const [filterTypes, setFilterTypes] = useState<number[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectTypeId, setProjectTypeId] = useState<number>(0);
  const [themeId, setThemeId] = useState<number | null>(null);
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', { project_type_ids: filterTypes, statuses: filterStatuses }],
    queryFn: () => api.projects.list({
      project_type_ids: filterTypes.length > 0 ? filterTypes : undefined,
      statuses: filterStatuses.length > 0 ? filterStatuses : undefined,
    }),
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: () => api.projectTypes.list(),
  });

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => api.themes.list(),
  });

  // Fetch full project type with fields when selection changes
  const { data: selectedProjectType } = useQuery({
    queryKey: ['projectType', projectTypeId],
    queryFn: () => projectTypeId ? api.projectTypes.get(projectTypeId) : null,
    enabled: !!projectTypeId,
  });

  // Set initial project type when data loads
  useEffect(() => {
    if (projectTypes?.items?.length && !projectTypeId) {
      setProjectTypeId(projectTypes.items[0].id);
    }
  }, [projectTypes?.items, projectTypeId]);

  // Reset custom data when project type changes
  useEffect(() => {
    setCustomData({});
  }, [projectTypeId]);

  const createMutation = useMutation({
    mutationFn: api.projects.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (data?.theme_id) {
        queryClient.invalidateQueries({ queryKey: ['theme', String(data.theme_id)] });
      }
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      modal.close();
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectTypeId(projectTypes?.items?.[0]?.id || 0);
    setThemeId(null);
    setCustomData({});
  };

  const handleOpenCreate = () => {
    resetForm();
    modal.openCreate();
  };

  const handleSubmit = () => {
    createMutation.mutate({
      title,
      description: description || undefined,
      project_type_id: projectTypeId,
      theme_id: themeId || undefined,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    });
  };

  const handleCustomFieldChange = (key: string, value: unknown) => {
    setCustomData((prev) => ({ ...prev, [key]: value }));
  };

  // Get unique statuses from project types - collect all statuses from all project type workflows
  const allStatuses: string[] = [];
  const statusSet = new Set<string>();
  projectTypes?.items?.forEach(pt => {
    pt.workflow?.forEach(status => {
      if (!statusSet.has(status)) {
        statusSet.add(status);
        allStatuses.push(status);
      }
    });
  });

  // Convert project type fields to CustomFieldDefinition format
  const customFields: CustomFieldDefinition[] = (selectedProjectType?.fields || []).map(field => ({
    key: field.key,
    label: field.label,
    field_type: field.field_type,
    required: field.required,
    options: field.options || undefined,
    order: field.order,
  }));

  // Table columns
  const columns: Column<Project>[] = [
    {
      key: 'project',
      header: 'Project',
      render: (project) => (
        <TableCellWithIcon
          icon={<FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          primary={
            <Link 
              to={`/projects/${project.id}`}
              className="font-medium text-gray-900 dark:text-white hover:text-primary-600"
            >
              {project.title}
            </Link>
          }
        />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (project) => (
        <StatusBadge color={project.project_type?.color}>
          {project.project_type?.name}
        </StatusBadge>
      ),
    },
    {
      key: 'theme',
      header: 'Theme',
      className: 'text-sm text-gray-500 dark:text-gray-400',
      render: (project) => project.theme?.title || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (project) => <AutoStatusBadge status={project.status} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      className: 'text-sm text-gray-500 dark:text-gray-400',
      render: (project) => new Date(project.updated_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'relative',
      render: (project) => (
        <TableActionsCell>
          <Link
            to={`/projects/${project.id}`}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            <ExternalLink className="h-5 w-5" />
          </Link>
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
        title="Projects"
        description="Cross-team work items with customizable workflows"
        action={
          <PrimaryActionButton
            label="New Project"
            onClick={handleOpenCreate}
          />
        }
      />

      {/* Filters */}
      <TableFilters
        filters={[
          {
            type: 'multi' as const,
            value: filterTypes,
            onChange: (v: (string | number)[]) => setFilterTypes(v as number[]),
            options: (projectTypes?.items || []).map(pt => ({
              value: pt.id,
              label: pt.name,
            })),
            placeholder: 'All Types',
          },
          {
            type: 'multi' as const,
            value: filterStatuses,
            onChange: (v: (string | number)[]) => setFilterStatuses(v as string[]),
            options: allStatuses.map(status => ({
              value: status,
              label: status,
            })),
            placeholder: 'All Statuses',
          },
        ]}
      />

      {/* Projects Table */}
      <DataTable
        columns={columns}
        data={projects?.items || []}
        keyExtractor={(project) => project.id}
        emptyState={{
          icon: FolderKanban,
          title: 'No projects',
          description: 'Get started by creating a new project.',
        }}
      />

      {/* Create Modal */}
      <FormModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        onSubmit={handleSubmit}
        title="Create Project"
        submitLabel="Create"
        loadingLabel="Creating..."
        isLoading={createMutation.isPending}
        isDisabled={!projectTypeId}
        size="lg"
      >
        <div className="space-y-4">
          <TextInput
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          <SelectInput
            label="Project Type"
            value={projectTypeId}
            onChange={(e) => setProjectTypeId(Number(e.target.value))}
            options={(projectTypes?.items || []).map(pt => ({
              value: pt.id,
              label: pt.name,
            }))}
          />
          
          <SelectInput
            label="Theme (Optional)"
            value={themeId || ''}
            onChange={(e) => setThemeId(e.target.value ? Number(e.target.value) : null)}
            options={(themes?.items || []).map(theme => ({
              value: theme.id,
              label: theme.title,
            }))}
            placeholder="No Theme"
          />
          
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Custom Fields
              </h3>
              <CustomFields
                fields={customFields}
                values={customData}
                onChange={handleCustomFieldChange}
              />
            </div>
          )}
        </div>
      </FormModal>
    </div>
  );
}
