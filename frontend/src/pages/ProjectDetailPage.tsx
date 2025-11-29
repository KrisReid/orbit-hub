import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ProjectTypeField, Task, TaskType, TaskTypeField, Team, Release, Project } from '@/types';
import { ArrowLeft, Plus, Trash2, X, ChevronDown, ExternalLink, GitBranch, ArrowDown, ArrowUp } from 'lucide-react';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLinkTaskDropdown, setShowLinkTaskDropdown] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const linkTaskDropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch all tasks for linking (use simple key for consistent invalidation)
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
      // Invalidate theme queries so project status updates appear live in theme detail pages
      if (project?.theme_id) {
        queryClient.invalidateQueries({ queryKey: ['theme', String(project.theme_id)] });
      }
      // Also invalidate the themes list in case status changes affect displays there
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      // If project type changed, invalidate the projectType query to fetch new fields
      if (variables.project_type_id) {
        queryClient.invalidateQueries({ queryKey: ['projectType'] });
      }
      setEditingDescription(false);
    },
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (linkTaskDropdownRef.current && !linkTaskDropdownRef.current.contains(event.target as Node)) {
        setShowLinkTaskDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Project not found</p>
      </div>
    );
  }

  const handleDescriptionSave = () => {
    updateMutation.mutate({ description });
  };

  // Get workflow array and current status index
  const workflow = projectType?.workflow || project.project_type?.workflow || [];
  const currentStatusIndex = workflow.indexOf(project.status);

  // Helper to determine the state of each workflow step
  const getStepState = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stepIndex < currentStatusIndex) return 'completed';
    if (stepIndex === currentStatusIndex) return 'current';
    return 'upcoming';
  };

  // Get linked task IDs
  const linkedTaskIds = new Set(project.tasks?.map(t => t.id) || []);
  const availableTasks = allTasks?.items?.filter(t => !linkedTaskIds.has(t.id)) || [];

  // Handle linking a task to this project
  const handleLinkTask = async (taskId: number) => {
    try {
      await api.tasks.update(taskId, { project_id: Number(id!) });
      // Invalidate ALL project queries so any project that previously had this task also refreshes
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowLinkTaskDropdown(false);
    } catch (error) {
      console.error('Failed to link task:', error);
    }
  };

  // Handle unlinking a task from this project
  const handleUnlinkTask = async (taskId: number) => {
    try {
      await api.tasks.update(taskId, { project_id: null });
      // Invalidate ALL project queries so any project views refresh
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to unlink task:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Cookie Trail */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <Link
              to="/projects"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* Theme Dropdown */}
            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {project.theme?.title || 'No Theme'}
                <ChevronDown className="h-4 w-4" />
              </button>
              {showThemeDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      updateMutation.mutate({ theme_id: null });
                      setShowThemeDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                      !project.theme_id ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {!project.theme_id && <span>✓</span>}
                    No Theme
                  </button>
                  {themes?.items?.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        if (theme.id !== project.theme_id) {
                          updateMutation.mutate({ theme_id: theme.id });
                        }
                        setShowThemeDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                        theme.id === project.theme_id ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {theme.id === project.theme_id && <span>✓</span>}
                      {theme.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-gray-300 dark:text-gray-600">›</span>

            {/* Project Type Dropdown */}
            <div className="relative" ref={typeDropdownRef}>
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {project.project_type?.name || 'Select Type'}
                <ChevronDown className="h-4 w-4" />
              </button>
              {showTypeDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1 max-h-64 overflow-y-auto">
                  {projectTypes?.items?.map(pt => (
                    <button
                      key={pt.id}
                      onClick={() => {
                        if (pt.id !== project.project_type_id) {
                          // When changing type, always reset status to first in new workflow
                          const newWorkflow = pt.workflow || [];
                          const newStatus = newWorkflow[0] || 'Backlog';
                          updateMutation.mutate({
                            project_type_id: pt.id,
                            status: newStatus,
                            // Clear custom_data when changing type since fields are different
                            custom_data: {}
                          });
                        }
                        setShowTypeDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                        pt.id === project.project_type_id ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {pt.id === project.project_type_id && <span>✓</span>}
                      {pt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {project.title}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description & Context */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Description & Context
            </h2>
            {editingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter project description..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDescriptionSave}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingDescription(false);
                      setDescription(project.description || '');
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setDescription(project.description || '');
                  setEditingDescription(true);
                }}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[100px] flex items-center"
              >
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {project.description || <span className="text-gray-500 italic">Click to add description...</span>}
                </p>
              </div>
            )}
          </div>

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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sequencing & Dependencies
            </h2>
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
          </div>

          {/* Linked Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Linked Tasks ({project.tasks?.length || 0})
              </h2>
              <div className="relative" ref={linkTaskDropdownRef}>
                <button
                  onClick={() => setShowLinkTaskDropdown(!showLinkTaskDropdown)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Link Task
                </button>
                {showLinkTaskDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 max-h-64 overflow-y-auto">
                    {tasksLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                        Loading tasks...
                      </div>
                    ) : availableTasks.length > 0 ? (
                      <div className="py-1">
                        {availableTasks.map(task => (
                          <button
                            key={task.id}
                            onClick={() => handleLinkTask(task.id)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-mono text-xs text-primary-600 dark:text-primary-400 mr-2">
                                {task.display_id}
                              </span>
                              <span className="text-sm text-gray-900 dark:text-white">{task.title}</span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              task.status === 'Done'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {task.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        No available tasks to link
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {project.tasks && project.tasks.length > 0 ? (
              <div className="space-y-2">
                {project.tasks.map((linkedTask) => {
                  // Find the full task from allTasks list
                  const fullTask = allTasks?.items?.find(t => t.id === linkedTask.id);
                  return (
                  <div
                    key={linkedTask.id}
                    onClick={() => fullTask && setSelectedTask(fullTask)}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                        {linkedTask.display_id}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">{linkedTask.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        linkedTask.status === 'Done'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {linkedTask.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkTask(linkedTask.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Unlink task"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tasks linked to this project yet. Click "Link Task" to associate existing tasks.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow State */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Workflow State
            </h3>
            <div className="space-y-3">
              {workflow.map((status, index) => {
                const stepState = getStepState(index);
                return (
                  <button
                    key={status}
                    onClick={() => updateMutation.mutate({ status })}
                    disabled={updateMutation.isPending}
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
          </div>

          {/* Project Info - Removed Theme and Type (now in header) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Info
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(project.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Updated</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(project.updated_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

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
            // Invalidate ALL project queries so any project views refresh
            queryClient.invalidateQueries({ queryKey: ['project'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}

// Task Edit Modal Component
function TaskEditModal({
  task,
  teams,
  taskTypes,
  projects,
  allTasks,
  onClose,
  onTaskUpdated,
}: {
  task: Task;
  teams: Team[];
  taskTypes: TaskType[];
  projects: Project[];
  allTasks: Task[];
  onClose: () => void;
  onTaskUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  
  // Fetch full task details including dependencies
  const { data: fullTask } = useQuery({
    queryKey: ['task', task.id],
    queryFn: () => api.tasks.get(task.id),
    initialData: task,
  });

  // Fetch task type with fields
  const { data: taskTypeWithFields } = useQuery({
    queryKey: ['taskType', task.task_type_id],
    queryFn: () => api.taskTypes.get(task.task_type_id),
  });

  // Fetch releases
  const { data: releases } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list(),
  });

  // Form state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [estimation, setEstimation] = useState<number | null>(task.estimation);
  const [projectId, setProjectId] = useState<number | null>(task.project_id);
  const [releaseId, setReleaseId] = useState<number | null>(task.release_id);
  const [teamId, setTeamId] = useState(task.team_id);
  const [taskTypeId, setTaskTypeId] = useState(task.task_type_id);
  const [customData, setCustomData] = useState<Record<string, unknown>>(task.custom_data || {});
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showTaskTypeDropdown, setShowTaskTypeDropdown] = useState(false);
  const [showDependencyDropdown, setShowDependencyDropdown] = useState(false);

  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const taskTypeDropdownRef = useRef<HTMLDivElement>(null);
  const dependencyDropdownRef = useRef<HTMLDivElement>(null);

  // Get current workflow based on selected task type
  const currentTaskType = taskTypes.find(tt => tt.id === taskTypeId);
  const workflow = currentTaskType?.workflow || [];

  // Fetch all task types for team switching
  const { data: allTaskTypes } = useQuery({
    queryKey: ['allTaskTypes'],
    queryFn: () => api.taskTypes.list({}),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: {
      title?: string;
      description?: string | null;
      status?: string;
      estimation?: number | null;
      project_id?: number | null;
      release_id?: number | null;
      team_id?: number;
      task_type_id?: number;
      custom_data?: Record<string, unknown>;
    }) => api.tasks.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
      // Invalidate ALL project queries so any project views refresh when task is updated
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['allTasksForLinking'] });
    },
  });

  // Dependency mutations
  const addDependencyMutation = useMutation({
    mutationFn: (dependsOnId: number) => api.addTaskDependency(task.id, dependsOnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: (dependsOnId: number) => api.removeTaskDependency(task.id, dependsOnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    },
  });

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setShowTeamDropdown(false);
      }
      if (taskTypeDropdownRef.current && !taskTypeDropdownRef.current.contains(event.target as Node)) {
        setShowTaskTypeDropdown(false);
      }
      if (dependencyDropdownRef.current && !dependencyDropdownRef.current.contains(event.target as Node)) {
        setShowDependencyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFieldChange = (field: string, value: unknown) => {
    const updateData: Partial<Task> = { [field]: value };
    updateMutation.mutate(updateData);
  };

  // Render custom field based on type
  const renderCustomField = (field: TaskTypeField) => {
    const value = customData[field.key] ?? '';
    
    const handleCustomFieldChange = (newValue: unknown) => {
      const newCustomData = { ...customData, [field.key]: newValue };
      setCustomData(newCustomData);
      handleFieldChange('custom_data', newCustomData);
    };

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => handleCustomFieldChange(e.target.value)}
            placeholder={`Enter ${field.label}...`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        );
      case 'textarea':
        return (
          <textarea
            value={String(value)}
            onChange={(e) => handleCustomFieldChange(e.target.value)}
            placeholder={`Enter ${field.label}...`}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value as number || ''}
            onChange={(e) => handleCustomFieldChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={`Enter ${field.label}...`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        );
      case 'select':
        return (
          <select
            value={String(value)}
            onChange={(e) => handleCustomFieldChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Select {field.label}...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'url':
        return (
          <input
            type="url"
            value={String(value)}
            onChange={(e) => handleCustomFieldChange(e.target.value)}
            placeholder={`Enter ${field.label}...`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={String(value)}
            onChange={(e) => handleCustomFieldChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleCustomFieldChange(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
          </label>
        );
      default:
        return null;
    }
  };

  // Available tasks for dependencies
  const existingDependencyIds = (fullTask as Task & { dependencies?: Array<{ id: number }> })?.dependencies?.map(d => d.id) || [];
  const availableTasksForDependency = allTasks.filter(
    t => t.id !== task.id && !existingDependencyIds.includes(t.id)
  );

  const selectedTeam = teams.find(t => t.id === teamId);
  const selectedTaskType = taskTypes.find(tt => tt.id === taskTypeId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              {/* Task ID */}
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {task.display_id}
              </span>
              
              {/* Team Dropdown */}
              <div className="relative" ref={teamDropdownRef}>
                <button
                  onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                  className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {selectedTeam?.name || 'Select Team'}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showTeamDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
                    {teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => {
                          if (team.id === teamId) {
                            setShowTeamDropdown(false);
                            return;
                          }
                          
                          const newTeamTaskTypes = (allTaskTypes?.items || []).filter(tt => tt.team_id === team.id);
                          const newTaskType = newTeamTaskTypes[0];
                          
                          if (newTaskType) {
                            const newWorkflow = newTaskType.workflow || [];
                            const newStatus = newWorkflow[0] || 'Backlog';
                            
                            updateMutation.mutate({
                              team_id: team.id,
                              task_type_id: newTaskType.id,
                              status: newStatus,
                            }, {
                              onSuccess: () => {
                                onTaskUpdated();
                              }
                            });
                          }
                          setShowTeamDropdown(false);
                        }}
                        disabled={!allTaskTypes?.items}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          team.id === teamId ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {team.id === teamId && <span>✓</span>}
                        {team.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-gray-300 dark:text-gray-600">›</span>

              {/* Task Type Dropdown */}
              <div className="relative" ref={taskTypeDropdownRef}>
                <button
                  onClick={() => setShowTaskTypeDropdown(!showTaskTypeDropdown)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {selectedTaskType?.name || 'Select Type'}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showTaskTypeDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
                    {(allTaskTypes?.items || taskTypes).filter(tt => tt.team_id === teamId).map(taskType => (
                      <button
                        key={taskType.id}
                        onClick={() => {
                          if (taskType.id === taskTypeId) {
                            setShowTaskTypeDropdown(false);
                            return;
                          }
                          
                          const newWorkflow = taskType.workflow || [];
                          const newStatus = newWorkflow.includes(status) ? status : newWorkflow[0] || 'Backlog';
                          
                          if (newStatus !== status) {
                            updateMutation.mutate({
                              task_type_id: taskType.id,
                              status: newStatus,
                            });
                            setStatus(newStatus);
                          } else {
                            updateMutation.mutate({ task_type_id: taskType.id });
                          }
                          
                          setTaskTypeId(taskType.id);
                          setShowTaskTypeDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          taskType.id === taskTypeId ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {taskType.id === taskTypeId && <span>✓</span>}
                        {taskType.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Task Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== task.title) {
                  handleFieldChange('title', title);
                }
              }}
              className="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 mb-6"
              placeholder="Task title..."
            />

            <div className="grid grid-cols-3 gap-8">
              {/* Left Column - Description, Project, Custom Fields */}
              <div className="col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => {
                      if (description !== (task.description || '')) {
                        handleFieldChange('description', description || null);
                      }
                    }}
                    placeholder="Add a description..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  />
                </div>

                {/* Associated Project */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Associated Project
                  </label>
                  <div className="relative">
                    <select
                      value={projectId || ''}
                      onChange={(e) => {
                        const newProjectId = e.target.value ? Number(e.target.value) : null;
                        setProjectId(newProjectId);
                        handleFieldChange('project_id', newProjectId);
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="">No Project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Custom Fields */}
                {taskTypeWithFields?.fields && taskTypeWithFields.fields.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Details
                    </label>
                    <div className="space-y-4">
                      {taskTypeWithFields.fields.map((field) => (
                        <div key={field.id}>
                          {field.field_type !== 'checkbox' && (
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                          )}
                          {renderCustomField(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Status, Estimation, Release, GitHub, Dependencies */}
              <div className="space-y-6">
                {/* Status - Workflow Style */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Workflow State
                  </label>
                  <div className="space-y-2">
                    {workflow.map((s, index) => {
                      const currentIndex = workflow.indexOf(status);
                      const stepState = index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming';
                      
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setStatus(s);
                            handleFieldChange('status', s);
                          }}
                          disabled={updateMutation.isPending}
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
                            {s}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estimation */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Estimation
                  </label>
                  <input
                    type="number"
                    value={estimation ?? ''}
                    onChange={(e) => setEstimation(e.target.value ? Number(e.target.value) : null)}
                    onBlur={() => {
                      if (estimation !== task.estimation) {
                        handleFieldChange('estimation', estimation);
                      }
                    }}
                    placeholder="Points"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Release */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Release
                  </label>
                  <div className="relative">
                    <select
                      value={releaseId || ''}
                      onChange={(e) => {
                        const newReleaseId = e.target.value ? Number(e.target.value) : null;
                        setReleaseId(newReleaseId);
                        handleFieldChange('release_id', newReleaseId);
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {releases?.items?.map((release) => (
                        <option key={release.id} value={release.id}>
                          {release.version} - {release.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Development / GitHub Links */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Development
                  </label>
                  {fullTask?.github_links && fullTask.github_links.length > 0 ? (
                    <div className="space-y-2">
                      {fullTask.github_links.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg"
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <GitBranch className="h-4 w-4" />
                            {fullTask.github_links?.length || 0} Pull Request{(fullTask.github_links?.length || 0) > 1 ? 's' : ''} linked
                          </a>
                          <button className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No PRs linked</p>
                  )}
                </div>

                {/* Dependencies */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Dependencies
                  </label>
                  <div className="relative" ref={dependencyDropdownRef}>
                    <button
                      onClick={() => setShowDependencyDropdown(!showDependencyDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:border-gray-400"
                    >
                      <span>+ Add Blocker</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                    {showDependencyDropdown && availableTasksForDependency.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        {availableTasksForDependency.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              addDependencyMutation.mutate(t.id);
                              setShowDependencyDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                          >
                            <span className="font-mono text-xs text-gray-400">{t.display_id}</span>
                            <span className="truncate">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Blocked By */}
                {(fullTask as Task & { dependencies?: Array<{ id: number; display_id: string; title: string; status: string }> })?.dependencies &&
                 (fullTask as Task & { dependencies?: Array<{ id: number; display_id: string; title: string; status: string }> }).dependencies!.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Blocked By
                    </label>
                    <div className="space-y-2">
                      {(fullTask as Task & { dependencies?: Array<{ id: number; display_id: string; title: string; status: string }> }).dependencies!.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <ArrowDown className="h-4 w-4" />
                            <span className="font-mono">{dep.display_id}</span>
                          </div>
                          <button
                            onClick={() => removeDependencyMutation.mutate(dep.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blocks */}
                {(fullTask as Task & { dependents?: Array<{ id: number; display_id: string; title: string; status: string }> })?.dependents &&
                 (fullTask as Task & { dependents?: Array<{ id: number; display_id: string; title: string; status: string }> }).dependents!.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Blocks
                    </label>
                    <div className="space-y-2">
                      {(fullTask as Task & { dependents?: Array<{ id: number; display_id: string; title: string; status: string }> }).dependents!.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                        >
                          <ArrowUp className="h-4 w-4" />
                          <span className="font-mono">{dep.display_id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Debounced text input component that saves on blur
function DebouncedTextInput({
  type = 'text',
  initialValue,
  onSave,
  placeholder,
  className,
  disabled,
}: {
  type?: 'text' | 'url' | 'number';
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(initialValue);
  
  // Update local value when prop changes (e.g., after save)
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
      className={className}
      disabled={disabled}
    />
  );
}

// Debounced textarea component that saves on blur
function DebouncedTextarea({
  initialValue,
  onSave,
  placeholder,
  className,
  disabled,
  rows = 3,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}) {
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
      className={className}
      disabled={disabled}
      rows={rows}
    />
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
          <DebouncedTextInput
            type="text"
            initialValue={String(value || '')}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={baseInputClass}
            disabled={isLoading}
          />
        );
      case 'textarea':
        return (
          <DebouncedTextarea
            initialValue={String(value || '')}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={`${baseInputClass} resize-none`}
            disabled={isLoading}
            rows={3}
          />
        );
      case 'number':
        return (
          <DebouncedTextInput
            type="number"
            initialValue={value !== undefined && value !== null ? String(value) : ''}
            onSave={(newValue) => onFieldChange(field.key, newValue ? Number(newValue) : null)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={baseInputClass}
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
        const urlValue = String(value || '');
        return (
          <UrlFieldWithLink
            initialValue={urlValue}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            className={`${baseInputClass} flex-1`}
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
          <DebouncedTextInput
            type="text"
            initialValue={String(value || '')}
            onSave={(newValue) => onFieldChange(field.key, newValue)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={baseInputClass}
            disabled={isLoading}
          />
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Details
      </h2>
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
    </div>
  );
}

// URL field with external link button
function UrlFieldWithLink({
  initialValue,
  onSave,
  className,
  disabled,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(initialValue);
  
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

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
        className={className}
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