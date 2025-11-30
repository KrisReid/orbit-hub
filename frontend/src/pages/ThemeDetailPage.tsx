import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { FolderKanban, Plus, Link as LinkIcon } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  DetailPageLayout,
  ContentCard,
  SidebarCard,
  InfoList,
  DeleteButton,
  InlineEditableTitle,
  InlineEditableTextarea,
  WorkflowSelector,
  LinkedItemsList,
  LinkedProjectRow,
  FormModal,
  EmptyState,
  TextInput,
  Textarea,
  SelectInput,
} from '@/components/ui';

// Storage key for theme workflow (shared with SettingsPage)
const THEME_STATUSES_STORAGE_KEY = 'theme_workflow_statuses';
const DEFAULT_THEME_STATUSES = ['active', 'completed', 'archived'];

// Get theme workflow from localStorage
function getThemeWorkflow(): string[] {
  try {
    const saved = localStorage.getItem(THEME_STATUSES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_THEME_STATUSES;
  } catch {
    return DEFAULT_THEME_STATUSES;
  }
}

export function ThemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Get the workflow for themes from localStorage (synced with Settings)
  const workflow = useMemo(() => getThemeWorkflow(), []);

  const { data: theme, isLoading } = useQuery({
    queryKey: ['theme', id],
    queryFn: () => api.themes.get(Number(id!)),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Fetch all projects for the add modal
  const { data: allProjectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list({ page_size: 100 }),
    enabled: showAddProjectModal,
  });

  // Fetch project types for create modal
  const { data: projectTypes } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: () => api.projectTypes.list(),
    enabled: showCreateProjectModal,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; title?: string; description?: string }) =>
      api.themes.update(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme', id] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.themes.delete(Number(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      navigate('/themes');
    },
  });

  // Mutation to add a project to this theme
  const addProjectToThemeMutation = useMutation({
    mutationFn: (projectId: number) =>
      api.projects.update(projectId, { theme_id: Number(id!) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowAddProjectModal(false);
    },
  });

  // Mutation to remove a project from this theme
  const removeProjectFromThemeMutation = useMutation({
    mutationFn: (projectId: number) =>
      api.projects.update(projectId, { theme_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Mutation to create a new project
  const createProjectMutation = useMutation({
    mutationFn: api.projects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreateProjectModal(false);
    },
  });

  if (isLoading || !theme) {
    return (
      <DetailPageLayout
        isLoading={isLoading}
        notFound={!isLoading && !theme}
        notFoundMessage="Theme not found"
        backHref="/themes"
        title={<></>}
      >
        <></>
      </DetailPageLayout>
    );
  }

  const handleDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Theme',
      message: 'Are you sure you want to delete this theme? This cannot be undone.',
      onConfirm: () => {
        deleteMutation.mutate();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleRemoveProject = (project: { id: number; title: string }) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Project',
      message: `Remove "${project.title}" from this theme?`,
      onConfirm: () => {
        removeProjectFromThemeMutation.mutate(project.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Get available projects (not already linked)
  const linkedProjectIds = new Set(theme.projects?.map(p => p.id) || []);
  const availableProjects = allProjectsData?.items?.filter(
    p => !linkedProjectIds.has(p.id)
  ) || [];

  return (
    <DetailPageLayout
      backHref="/themes"
      breadcrumbs={[{ label: 'Themes', href: '/themes' }]}
      title={
        <InlineEditableTitle
          value={theme.title}
          onSave={(title) => updateMutation.mutate({ title })}
          isLoading={updateMutation.isPending}
          className="mb-2"
        />
      }
      headerActions={
        <DeleteButton
          onClick={handleDelete}
          isLoading={deleteMutation.isPending}
        />
      }
      sidebar={
        <>
          {/* Status / Workflow */}
          <SidebarCard title="Status">
            <WorkflowSelector
              workflow={workflow}
              currentStatus={theme.status}
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
                  value: new Date(theme.created_at).toLocaleDateString(),
                },
                {
                  label: 'Updated',
                  value: new Date(theme.updated_at).toLocaleDateString(),
                },
              ]}
            />
          </SidebarCard>
        </>
      }
    >
      {/* Description */}
      <ContentCard title="Description">
        <InlineEditableTextarea
          value={theme.description || ''}
          onSave={(description) => updateMutation.mutate({ description })}
          placeholder="Click to add description..."
          isLoading={updateMutation.isPending}
        />
      </ContentCard>

      {/* Linked Projects */}
      <ContentCard
        title={`Linked Projects (${theme.projects?.length || 0})`}
        headerAction={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LinkIcon className="h-4 w-4" />
              Link Existing
            </button>
          </div>
        }
      >
        {theme.projects && theme.projects.length > 0 ? (
          <div className="space-y-2">
            {theme.projects.map((project) => (
              <LinkedProjectRow
                key={project.id}
                project={project}
                onUnlink={() => handleRemoveProject(project)}
                icon={FolderKanban}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No projects linked to this theme yet. Click "Add Project" to link existing projects.
          </p>
        )}
      </ContentCard>

      {/* Add Project Modal */}
      <FormModal
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onSubmit={() => {}}
        title="Add Project to Theme"
        submitLabel=""
        cancelLabel="Close"
        size="lg"
      >
        {availableProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No available projects"
            description="All projects are already linked to this theme or there are no projects yet."
          />
        ) : (
          <div className="space-y-2">
            {availableProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => addProjectToThemeMutation.mutate(project.id)}
                disabled={addProjectToThemeMutation.isPending}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{project.title}</p>
                    {project.theme && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Currently in: {project.theme.title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    project.status === 'Done'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : project.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {project.status}
                  </span>
                  <Plus className="h-4 w-4 text-primary-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </FormModal>

      {/* Create Project Modal */}
      <CreateProjectForThemeModal
        isOpen={showCreateProjectModal}
        themeId={Number(id!)}
        projectTypes={projectTypes?.items || []}
        onClose={() => setShowCreateProjectModal(false)}
        onProjectCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['theme', id] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          setShowCreateProjectModal(false);
        }}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending || removeProjectFromThemeMutation.isPending}
      />
    </DetailPageLayout>
  );
}

// Create Project Modal for Theme
interface CreateProjectForThemeModalProps {
  isOpen: boolean;
  themeId: number;
  projectTypes: { id: number; name: string; workflow?: string[] }[];
  onClose: () => void;
  onProjectCreated: () => void;
}

function CreateProjectForThemeModal({
  isOpen,
  themeId,
  projectTypes,
  onClose,
  onProjectCreated,
}: CreateProjectForThemeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectTypeId, setProjectTypeId] = useState<number>(0);

  // Set initial project type when data loads
  useEffect(() => {
    if (projectTypes.length > 0 && !projectTypeId) {
      setProjectTypeId(projectTypes[0].id);
    }
  }, [projectTypes, projectTypeId]);

  const createMutation = useMutation({
    mutationFn: api.projects.create,
    onSuccess: () => {
      onProjectCreated();
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
      project_type_id: projectTypeId,
      theme_id: themeId,
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
      title="Create Project"
      submitLabel="Create"
      loadingLabel="Creating..."
      isLoading={createMutation.isPending}
      isDisabled={!projectTypeId || !title.trim()}
    >
      <div className="space-y-4">
        <TextInput
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title..."
        />

        <SelectInput
          label="Project Type"
          value={projectTypeId}
          onChange={(e) => setProjectTypeId(Number(e.target.value))}
          options={projectTypes.map(pt => ({ value: pt.id, label: pt.name }))}
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
            This project will be automatically linked to the current theme.
          </p>
        </div>
      </div>
    </FormModal>
  );
}