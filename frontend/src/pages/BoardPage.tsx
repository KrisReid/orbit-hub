import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Task, TaskType, TaskTypeField, Team, Release, Project } from '@/types';
import { Plus, GitBranch, ExternalLink, Eye, Filter, ChevronDown, AlertTriangle, X, ArrowDown, ArrowUp } from 'lucide-react';

interface CardDisplaySettings {
  showId: boolean;
  showProject: boolean;
  showRelease: boolean;
  showBlockers: boolean;
  showGithub: boolean;
}

export function BoardPage() {
  const { teamSlug } = useParams<{ teamSlug?: string }>();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [cardDisplay, setCardDisplay] = useState<CardDisplaySettings>({
    showId: true,
    showProject: true,
    showRelease: false,
    showBlockers: true,
    showGithub: true,
  });
  const displaySettingsRef = useRef<HTMLDivElement>(null);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.teams.list(),
  });

  const selectedTeam = teams?.items?.find(t => t.slug === teamSlug) || teams?.items?.[0];

  const { data: taskTypes } = useQuery({
    queryKey: ['taskTypes', selectedTeam?.id],
    queryFn: () => api.taskTypes.list({ team_id: selectedTeam?.id }),
    enabled: !!selectedTeam?.id,
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', selectedTeam?.id],
    queryFn: () => api.tasks.list({ team_id: selectedTeam?.id, page_size: 100 }),
    enabled: !!selectedTeam?.id,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list({ page_size: 100 }),
  });

  // Close display settings when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (displaySettingsRef.current && !displaySettingsRef.current.contains(event.target as Node)) {
        setShowDisplaySettings(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string } }) =>
      api.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowModal(false);
    },
  });

  // Filter tasks by selected project
  const filteredTasks = tasks?.items?.filter(task => {
    if (selectedProjectId === 'all') return true;
    return task.project_id === selectedProjectId;
  }) || [];

  // Group tasks by task type and status
  const tasksByTaskTypeAndStatus = taskTypes?.items?.reduce((acc, taskType) => {
    acc[taskType.id] = (taskType.workflow || []).reduce((statusAcc, status) => {
      statusAcc[status] = filteredTasks.filter(
        t => t.task_type_id === taskType.id && t.status === status
      ) || [];
      return statusAcc;
    }, {} as Record<string, Task[]>);
    return acc;
  }, {} as Record<number, Record<string, Task[]>>) || {};

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', String(task.id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData('taskId'));
    updateMutation.mutate({ id: taskId, data: { status } });
  };

  if (!selectedTeam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No teams available. Create a team first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedTeam?.name} Board
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          {/* Card Display Settings */}
          <div className="relative" ref={displaySettingsRef}>
            <button
              onClick={() => setShowDisplaySettings(!showDisplaySettings)}
              className={`p-2 rounded-lg border transition-colors ${
                showDisplaySettings
                  ? 'bg-primary-50 border-primary-300 text-primary-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Card display settings"
            >
              <Eye className="h-5 w-5" />
            </button>
            {showDisplaySettings && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Card Display
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardDisplay.showId}
                      onChange={(e) => setCardDisplay({ ...cardDisplay, showId: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show ID</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardDisplay.showProject}
                      onChange={(e) => setCardDisplay({ ...cardDisplay, showProject: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show Project</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardDisplay.showRelease}
                      onChange={(e) => setCardDisplay({ ...cardDisplay, showRelease: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show Release</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardDisplay.showBlockers}
                      onChange={(e) => setCardDisplay({ ...cardDisplay, showBlockers: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show Blockers</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardDisplay.showGithub}
                      onChange={(e) => setCardDisplay({ ...cardDisplay, showGithub: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show Github</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Project Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Projects</option>
                {projects?.items?.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* New Task Button */}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Task
          </button>
        </div>
      </div>

      {/* Kanban Boards - One per Task Type */}
      <div className="space-y-8">
        {taskTypes?.items?.map((taskType) => (
          <div key={taskType.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: taskType.color || '#ccc' }}
              />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {taskType.name}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({Object.values(tasksByTaskTypeAndStatus[taskType.id] || {}).reduce((sum, taskList) => sum + taskList.length, 0)} tasks)
              </span>
            </div>
            <div className="flex space-x-4 overflow-x-auto pb-4 items-stretch">
              {(taskType.workflow || []).map((status) => (
                <div
                  key={status}
                  className="flex-shrink-0 w-72 flex"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                        {status}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {tasksByTaskTypeAndStatus[taskType.id]?.[status]?.length || 0}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[200px] flex-1">
                      {tasksByTaskTypeAndStatus[taskType.id]?.[status]?.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => setSelectedTask(task)}
                          className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          {cardDisplay.showId && (
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                                {task.display_id}
                              </span>
                              {task.estimation && (
                                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                                  {task.estimation}
                                </span>
                              )}
                            </div>
                          )}
                          {cardDisplay.showProject && task.project && (
                            <p className="mb-1 text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
                              <span className="inline-block w-2 h-2 bg-primary-400 rounded-sm" />
                              {task.project.title}
                            </p>
                          )}
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {task.title}
                          </p>
                          {cardDisplay.showRelease && task.release && (
                            <p className="mt-2 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <span className="inline-block w-2 h-2 bg-purple-400 rounded-full" />
                              {task.release.version} - {task.release.title}
                            </p>
                          )}
                          {cardDisplay.showBlockers && task.dependencies && task.dependencies.length > 0 && (
                            <div className="mt-2 flex items-center text-xs text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {task.dependencies.length} blocker{task.dependencies.length > 1 ? 's' : ''}
                            </div>
                          )}
                          {cardDisplay.showGithub && task.github_links && task.github_links.length > 0 && (
                            <div className="mt-2 flex items-center text-xs text-gray-400">
                              <GitBranch className="h-3 w-3 mr-1" />
                              {task.github_links.length} PR{task.github_links.length > 1 ? 's' : ''}
                            </div>
                          )}
                          {/* Drag handle */}
                          <div className="mt-2 flex justify-center">
                            <div className="text-gray-300 dark:text-gray-600">
                              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="5" cy="4" r="1.5" />
                                <circle cx="11" cy="4" r="1.5" />
                                <circle cx="5" cy="8" r="1.5" />
                                <circle cx="11" cy="8" r="1.5" />
                                <circle cx="5" cy="12" r="1.5" />
                                <circle cx="11" cy="12" r="1.5" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Drop hint */}
                    {tasksByTaskTypeAndStatus[taskType.id]?.[status]?.length === 0 && (
                      <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
                        Drop here
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Task Edit Modal */}
      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          teams={teams?.items || []}
          taskTypes={taskTypes?.items || []}
          projects={projects?.items || []}
          allTasks={tasks?.items || []}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSelectedTask(null);
          }}
        />
      )}

      {/* Create Task Modal */}
      {showModal && (
        <CreateTaskModal
          teamId={selectedTeam.id}
          taskTypes={taskTypes?.items || []}
          projects={projects?.items || []}
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

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

  // Update mutation with proper typing for all updatable fields
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
      // Invalidate all task-related queries to ensure board updates
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
    },
    onError: (error) => {
      console.error('Failed to update task:', error);
      // Optionally show an error toast/notification here
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

  // Save handler with debounce effect
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

  // Available tasks for dependencies (exclude self and already added)
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
                          // Skip if same team
                          if (team.id === teamId) {
                            setShowTeamDropdown(false);
                            return;
                          }
                          
                          // When changing team, we need to also update the task type
                          // since task types are team-specific
                          // Only use allTaskTypes for cross-team moves, not the prop which is team-specific
                          const newTeamTaskTypes = (allTaskTypes?.items || []).filter(tt => tt.team_id === team.id);
                          const newTaskType = newTeamTaskTypes[0];
                          
                          if (newTaskType) {
                            const newWorkflow = newTaskType.workflow || [];
                            const newStatus = newWorkflow[0] || 'Backlog';
                            
                            // Update all related fields in a single mutation
                            updateMutation.mutate({
                              team_id: team.id,
                              task_type_id: newTaskType.id,
                              status: newStatus,
                            }, {
                              onSuccess: () => {
                                // Close modal after team change since task moved to different board
                                onTaskUpdated();
                              }
                            });
                          } else {
                            // No task types available for the new team - show error or warning
                            console.warn(`No task types available for team ${team.name}`);
                            setShowTeamDropdown(false);
                            return;
                          }
                          setShowTeamDropdown(false);
                        }}
                        disabled={!allTaskTypes?.items}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          team.id === teamId ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                        } ${!allTaskTypes?.items ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    {/* Use allTaskTypes if available, otherwise fall back to taskTypes prop for same-team filtering */}
                    {(allTaskTypes?.items || taskTypes).filter(tt => tt.team_id === teamId).map(taskType => (
                      <button
                        key={taskType.id}
                        onClick={() => {
                          // Skip if same task type
                          if (taskType.id === taskTypeId) {
                            setShowTaskTypeDropdown(false);
                            return;
                          }
                          
                          // Reset status to first status in new workflow if current status is not valid
                          const newWorkflow = taskType.workflow || [];
                          const newStatus = newWorkflow.includes(status) ? status : newWorkflow[0] || 'Backlog';
                          
                          // Update both task type and potentially status in single mutation
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

                {/* Dependencies - Tasks this blocks */}
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

                {/* Blocked By - Tasks that block this */}
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

                {/* Blocks - Tasks blocked by this */}
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

function CreateTaskModal({
  teamId,
  taskTypes,
  projects,
  onClose,
  onSubmit,
  isLoading,
}: {
  teamId: number;
  taskTypes: TaskType[];
  projects: { id: number; title: string }[];
  onClose: () => void;
  onSubmit: (data: { 
    title: string; 
    description?: string; 
    team_id: number; 
    task_type_id: number; 
    project_id?: number 
  }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskTypeId, setTaskTypeId] = useState<number>(taskTypes[0]?.id || 0);
  const [projectId, setProjectId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      team_id: teamId,
      task_type_id: taskTypeId,
      project_id: projectId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create Task
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={taskTypeId}
                onChange={(e) => setTaskTypeId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {taskTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>{tt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project (Optional)
              </label>
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !taskTypeId}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
