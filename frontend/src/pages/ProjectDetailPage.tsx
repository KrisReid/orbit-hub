import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ProjectTypeField, Task, TaskType } from '@/types';
import { ExternalLink, ChevronDown, Plus, Trash2, Link as LinkIcon, CheckSquare } from 'lucide-react';
import { TaskEditModal } from '@/components/TaskEditModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  DetailPageLayout,
  ContentCard,
  SidebarCard,
  InfoList,
  InlineEditableTextarea,
  WorkflowSelector,
  LinkedTaskRow,
  LinkedItemsList,
  DebouncedInput,
  DebouncedTextarea,
  BreadcrumbDropdown,
  FormModal,
  TextInput,
  Textarea,
  SelectInput,
  EmptyState,
} from '@/components/ui';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showLinkTaskModal, setShowLinkTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(Number(id!)),
    enabled: !!id,
  });

  const { data: projectType } = useQuery({
    queryKey: ['projectType', project?.project_type?.id],
    queryFn: () => api.projectTypes.get(project!.project_type!.id),
    enabled: !!project?.project_type?.id,
  });

  // Fetch themes for dropdown
  const { data: themes } = useQuery({
    queryKey: ['themes', { include_archived: false }],
    queryFn: () => api.themes.list({ include_archived: false }),
  });

  // Fetch project types for dropdown
  const { data: projectTypes } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: () => api.projectTypes.list(),
  });

  // Fetch all tasks for linking
  const { data: allTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['allTasksForLinking'],
    queryFn: () => api.tasks.list({ page_size: 100 }),
  });

  // Fetch teams for task modal
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.teams.list(),
  });

  // Fetch all task types for task modal
  const { data: taskTypes } = useQuery({
    queryKey: ['allTaskTypes'],
    queryFn: () => api.taskTypes.list({}),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; description?: string; custom_data?: Record<string, unknown>; theme_id?: number | null; project_type_id?: number }) =>
      api.projects.update(Number(id!), data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (project?.theme_id) {
        queryClient.invalidateQueries({ queryKey: ['theme', String(project.theme_id)] });
      }
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      if (variables.project_type_id) {
        queryClient.invalidateQueries({ queryKey: ['projectType'] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.projects.delete(Number(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      navigate('/projects');
    },
  });

  // Get workflow array and current status index
  const workflow = projectType?.workflow || project?.project_type?.workflow || [];

  // Get linked task IDs
  const linkedTaskIds = new Set(project?.tasks?.map(t => t.id) || []);
  const availableTasks = allTasks?.items?.filter(t => !linkedTaskIds.has(t.id)) || [];

  // Handle linking a task to this project
  const handleLinkTask = async (taskId: number) => {
    try {
      await api.tasks.update(taskId, { project_id: Number(id!) });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to link task:', error);
    }
  };

  // Handle unlinking a task from this project
  const handleUnlinkTask = async (taskId: number) => {
    try {
      await api.tasks.update(taskId, { project_id: null });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to unlink task:', error);
    }
  };

  // Prepare theme options for dropdown
  const themeOptions = [
    ...(themes?.items?.map(t => ({ value: t.id, label: t.title })) || [])
  ];

  // Prepare project type options for dropdown
  const projectTypeOptions = projectTypes?.items?.map(pt => ({ value: pt.id, label: pt.name })) || [];

  if (isLoading || !project) {
    return (
      <DetailPageLayout
        isLoading={isLoading}
        notFound={!isLoading && !project}
        notFoundMessage="Project not found"
        backHref="/projects"
        title={<></>}
      >
        <></>
      </DetailPageLayout>
    );
  }

  return (
    <DetailPageLayout
      backHref="/projects"
      breadcrumbs={[
        {
          label: project.theme?.title || 'No Theme',
          dropdown: (
            <BreadcrumbDropdown
              value={project.theme_id}
              onChange={(value) => updateMutation.mutate({ theme_id: value })}
              options={themeOptions}
              placeholder="No Theme"
              allowNull
              nullLabel="No Theme"
              variant="primary"
            />
          ),
        },
        {
          label: project.project_type?.name || 'Select Type',
          dropdown: (
            <BreadcrumbDropdown
              value={project.project_type_id}
              onChange={(value) => {
                if (value && value !== project.project_type_id) {
                  const newType = projectTypes?.items?.find(pt => pt.id === value);
                  const newWorkflow = newType?.workflow || [];
                  const newStatus = newWorkflow[0] || 'Backlog';
                  updateMutation.mutate({
                    project_type_id: value,
                    status: newStatus,
                    custom_data: {}
                  });
                }
              }}
              options={projectTypeOptions}
              placeholder="Select Type"
              variant="secondary"
            />
          ),
        },
      ]}
      title={
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {project.title}
        </h1>
      }
      sidebar={
        <>
          {/* Workflow State */}
          <SidebarCard title="Workflow State">
            <WorkflowSelector
              workflow={workflow}
              currentStatus={project.status}
              onStatusChange={(status) => updateMutation.mutate({ status })}
              isLoading={updateMutation.isPending}
            />
          </SidebarCard>

          {/* Info */}
          <SidebarCard title="Info">
            <InfoList
              items={[
                {
                  label: 'Created',
                  value: new Date(project.created_at).toLocaleDateString(),
                },
                {
                  label: 'Updated',
                  value: new Date(project.updated_at).toLocaleDateString(),
                },
              ]}
            />
          </SidebarCard>

          {/* Actions */}
          <SidebarCard title="Actions">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Project
            </button>
          </SidebarCard>
        </>
      }
    >
      {/* Description & Context */}
      <ContentCard title="Description & Context">
        <InlineEditableTextarea
          value={project.description || ''}
          onSave={(description) => updateMutation.mutate({ description })}
          placeholder="Click to add description..."
          isLoading={updateMutation.isPending}
        />
      </ContentCard>

      {/* Custom Fields - Inline Editable */}
      {projectType?.fields && projectType.fields.length > 0 && (
        <InlineCustomFields
          fields={projectType.fields}
          customData={project.custom_data || {}}
          onFieldChange={(key, value) => {
            const newCustomData = { ...project.custom_data, [key]: value };
            updateMutation.mutate({ custom_data: newCustomData });
          }}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Dependencies */}
      <ContentCard title="Sequencing & Dependencies">
        {project.dependencies && project.dependencies.length > 0 ? (
          <div className="space-y-2 mb-4">
            {project.dependencies.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <Link
                  to={`/projects/${dep.id}`}
                  className="text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <div>
                    <p className="font-medium">{dep.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{dep.status}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No dependencies defined
          </p>
        )}
        <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
          + Add dependency
        </button>
      </ContentCard>

      {/* Linked Tasks */}
      <ContentCard
        title={`Linked Tasks (${project.tasks?.length || 0})`}
        headerAction={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Task
            </button>
            <button
              onClick={() => setShowLinkTaskModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LinkIcon className="h-4 w-4" />
              Link Existing
            </button>
          </div>
        }
      >
        {project.tasks && project.tasks.length > 0 ? (
          <div className="space-y-2">
            {project.tasks.map((task) => {
              const fullTask = allTasks?.items?.find(t => t.id === task.id);
              return (
                <LinkedTaskRow
                  key={task.id}
                  task={{
                    id: task.id,
                    display_id: task.display_id || '',
                    title: task.title,
                    status: task.status || '',
                  }}
                  onUnlink={() => handleUnlinkTask(task.id)}
                  onClick={() => fullTask && setSelectedTask(fullTask)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tasks linked to this project yet. Click "Add Task" to link existing tasks.
          </p>
        )}
      </ContentCard>

      {/* Link Task Modal */}
      <FormModal
        isOpen={showLinkTaskModal}
        onClose={() => setShowLinkTaskModal(false)}
        onSubmit={() => {}}
        title="Link Task to Project"
        submitLabel=""
        cancelLabel="Close"
        size="lg"
      >
        {availableTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No available tasks"
            description="All tasks are already linked to this project or there are no tasks yet."
          />
        ) : (
          <div className="space-y-2">
            {availableTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  handleLinkTask(task.id);
                  setShowLinkTaskModal(false);
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {task.display_id && (
                        <span className="text-gray-500 dark:text-gray-400 mr-2">{task.display_id}</span>
                      )}
                      {task.title}
                    </p>
                    {task.project && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Currently in: {task.project.title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    task.status === 'Done'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : task.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {task.status}
                  </span>
                  <Plus className="h-4 w-4 text-primary-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </FormModal>

      {/* Task Edit Modal */}
      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          teams={teams?.items || []}
          taskTypes={taskTypes?.items || []}
          projects={[project]}
          allTasks={allTasks?.items || []}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['project'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSelectedTask(null);
          }}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskForProjectModal
        isOpen={showCreateTaskModal}
        projectId={Number(id!)}
        teams={teams?.items || []}
        taskTypes={taskTypes?.items || []}
        onClose={() => setShowCreateTaskModal(false)}
        onTaskCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['project'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          setShowCreateTaskModal(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.title}"? This action cannot be undone. Tasks linked to this project will be unlinked but not deleted.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </DetailPageLayout>
  );
}

// Create Task Modal for Project
interface CreateTaskForProjectModalProps {
  isOpen: boolean;
  projectId: number;
  teams: { id: number; name: string; slug: string }[];
  taskTypes: TaskType[];
  onClose: () => void;
  onTaskCreated: () => void;
}

function CreateTaskForProjectModal({
  isOpen,
  projectId,
  teams,
  taskTypes,
  onClose,
  onTaskCreated,
}: CreateTaskForProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState<number>(0);
  const [taskTypeId, setTaskTypeId] = useState<number>(0);

  // Get task types for selected team
  const teamTaskTypes = taskTypes.filter(tt => tt.team_id === teamId);

  // Set initial team when data loads
  useEffect(() => {
    if (teams.length > 0 && !teamId) {
      setTeamId(teams[0].id);
    }
  }, [teams, teamId]);

  // Set initial task type when team changes
  useEffect(() => {
    if (teamTaskTypes.length > 0) {
      const currentTypeValid = teamTaskTypes.find(tt => tt.id === taskTypeId);
      if (!currentTypeValid) {
        setTaskTypeId(teamTaskTypes[0].id);
      }
    } else {
      setTaskTypeId(0);
    }
  }, [teamId, teamTaskTypes, taskTypeId]);

  const createMutation = useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => {
      onTaskCreated();
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
  };

  const handleSubmit = () => {
    createMutation.mutate({
      title,
      description: description || undefined,
      team_id: teamId,
      task_type_id: taskTypeId,
      project_id: projectId,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title="Create Task"
      submitLabel="Create"
      loadingLabel="Creating..."
      isLoading={createMutation.isPending}
      isDisabled={!teamId || !taskTypeId || !title.trim()}
    >
      <div className="space-y-4">
        <TextInput
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
        />

        <SelectInput
          label="Team"
          value={teamId}
          onChange={(e) => setTeamId(Number(e.target.value))}
          options={teams.map(t => ({ value: t.id, label: t.name }))}
        />

        <SelectInput
          label="Type"
          value={taskTypeId}
          onChange={(e) => setTaskTypeId(Number(e.target.value))}
          options={teamTaskTypes.map(tt => ({ value: tt.id, label: tt.name }))}
          disabled={teamTaskTypes.length === 0}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a description..."
        />

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This task will be automatically linked to the current project.
          </p>
        </div>
      </div>
    </FormModal>
  );
}

// Inline Editable Custom Fields Component
function InlineCustomFields({
  fields,
  customData,
  onFieldChange,
  isLoading,
}: {
  fields: ProjectTypeField[];
  customData: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  isLoading: boolean;
}) {
  const baseInputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  const renderField = (field: ProjectTypeField) => {
    const value = customData[field.key];

    switch (field.field_type) {
      case 'text':
        return (
          <DebouncedInput
            type="text"
            initialValue={String(value || '')}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            disabled={isLoading}
          />
        );
      case 'textarea':
        return (
          <DebouncedTextarea
            initialValue={String(value || '')}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            disabled={isLoading}
            rows={3}
          />
        );
      case 'number':
        return (
          <DebouncedInput
            type="number"
            initialValue={value !== undefined && value !== null ? String(value) : ''}
            onSave={(newValue) => onFieldChange(field.key, newValue ? Number(newValue) : null)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            disabled={isLoading}
          />
        );
      case 'select':
        return (
          <div className="relative">
            <select
              value={String(value || '')}
              onChange={(e) => onFieldChange(field.key, e.target.value || null)}
              className={`${baseInputClass} appearance-none cursor-pointer`}
              disabled={isLoading}
            >
              <option value="">Select {field.label.toLowerCase()}...</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        );
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v) => v !== opt);
                    onFieldChange(field.key, newValues);
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'url':
        return (
          <UrlFieldWithLink
            initialValue={String(value || '')}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            disabled={isLoading}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value ? String(value).split('T')[0] : ''}
            onChange={(e) => onFieldChange(field.key, e.target.value || null)}
            className={baseInputClass}
            disabled={isLoading}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer p-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onFieldChange(field.key, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              disabled={isLoading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
          </label>
        );
      default:
        return (
          <DebouncedInput
            type="text"
            initialValue={String(value || '')}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            disabled={isLoading}
          />
        );
    }
  };

  return (
    <ContentCard title="Details">
      <div className="space-y-4">
        {fields.sort((a, b) => a.order - b.order).map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

// URL field with external link button
function UrlFieldWithLink({
  initialValue,
  onSave,
  disabled,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(initialValue);
  const baseInputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== initialValue) {
            onSave(localValue);
          }
        }}
        placeholder="https://"
        className={`${baseInputClass} flex-1`}
        disabled={disabled}
      />
      {localValue && (
        <a
          href={localValue}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}