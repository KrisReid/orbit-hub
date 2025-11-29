import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Task, TaskType, TaskTypeField, Team, Project } from '@/types';
import { GitBranch, ChevronDown, X, ArrowDown, ArrowUp } from 'lucide-react';
import { 
  WorkflowSelector, 
  DynamicField, 
  SelectInput,
  SimpleSelector,
} from './ui';
import { useClickOutside, useDropdownClose } from '@/hooks';

interface TaskEditModalProps {
  task: Task;
  teams: Team[];
  taskTypes: TaskType[];
  projects: Project[];
  allTasks: Task[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskEditModal({
  task,
  teams,
  taskTypes,
  projects,
  allTasks,
  onClose,
  onTaskUpdated,
}: TaskEditModalProps) {
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
  
  // Dropdown states
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showTaskTypeDropdown, setShowTaskTypeDropdown] = useState(false);
  const [showDependencyDropdown, setShowDependencyDropdown] = useState(false);

  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const taskTypeDropdownRef = useRef<HTMLDivElement>(null);
  const dependencyDropdownRef = useRef<HTMLDivElement>(null);

  // Use click outside hook for dropdowns
  useDropdownClose([
    { ref: teamDropdownRef, isOpen: showTeamDropdown, close: () => setShowTeamDropdown(false) },
    { ref: taskTypeDropdownRef, isOpen: showTaskTypeDropdown, close: () => setShowTaskTypeDropdown(false) },
    { ref: dependencyDropdownRef, isOpen: showDependencyDropdown, close: () => setShowDependencyDropdown(false) },
  ]);

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

  const handleFieldChange = (field: string, value: unknown) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleCustomFieldChange = (key: string, value: unknown) => {
    const newCustomData = { ...customData, [key]: value };
    setCustomData(newCustomData);
    handleFieldChange('custom_data', newCustomData);
  };

  // Available tasks for dependencies (exclude self and already added)
  type TaskWithDependencies = Task & { dependencies?: Array<{ id: number }> };
  const existingDependencyIds = (fullTask as TaskWithDependencies)?.dependencies?.map(d => d.id) || [];
  const availableTasksForDependency = allTasks.filter(
    t => t.id !== task.id && !existingDependencyIds.includes(t.id)
  );

  const selectedTeam = teams.find(t => t.id === teamId);
  const selectedTaskType = taskTypes.find(tt => tt.id === taskTypeId);

  // Type for task with full dependency info
  type TaskWithFullDependencies = Task & { 
    dependencies?: Array<{ id: number; display_id: string; title: string; status: string }>;
    dependents?: Array<{ id: number; display_id: string; title: string; status: string }>;
  };

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
                  <SelectInput
                    value={projectId || ''}
                    onChange={(e) => {
                      const newProjectId = e.target.value ? Number(e.target.value) : null;
                      setProjectId(newProjectId);
                      handleFieldChange('project_id', newProjectId);
                    }}
                    options={projects.map(p => ({ value: p.id, label: p.title }))}
                    placeholder="No Project"
                  />
                </div>

                {/* Custom Fields - using DynamicField component */}
                {taskTypeWithFields?.fields && taskTypeWithFields.fields.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Details
                    </label>
                    <div className="space-y-4">
                      {taskTypeWithFields.fields.map((field) => (
                        <DynamicField
                          key={field.id}
                          field={{
                            key: field.key,
                            label: field.label,
                            field_type: field.field_type,
                            required: field.required,
                            options: field.options || undefined,
                          }}
                          value={customData[field.key]}
                          onChange={(value) => handleCustomFieldChange(field.key, value)}
                        />
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
                  <WorkflowSelector
                    workflow={workflow}
                    currentStatus={status}
                    onStatusChange={(newStatus: string) => {
                      setStatus(newStatus);
                      handleFieldChange('status', newStatus);
                    }}
                    isLoading={updateMutation.isPending}
                  />
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
                  <SelectInput
                    value={releaseId || ''}
                    onChange={(e) => {
                      const newReleaseId = e.target.value ? Number(e.target.value) : null;
                      setReleaseId(newReleaseId);
                      handleFieldChange('release_id', newReleaseId);
                    }}
                    options={(releases?.items || []).map(r => ({ 
                      value: r.id, 
                      label: `${r.version} - ${r.title}` 
                    }))}
                    placeholder="Unassigned"
                  />
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

                {/* Dependencies - Add Blocker */}
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
                {(fullTask as TaskWithFullDependencies)?.dependencies &&
                 (fullTask as TaskWithFullDependencies).dependencies!.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Blocked By
                    </label>
                    <div className="space-y-2">
                      {(fullTask as TaskWithFullDependencies).dependencies!.map((dep) => (
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
                {(fullTask as TaskWithFullDependencies)?.dependents &&
                 (fullTask as TaskWithFullDependencies).dependents!.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Blocks
                    </label>
                    <div className="space-y-2">
                      {(fullTask as TaskWithFullDependencies).dependents!.map((dep) => (
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