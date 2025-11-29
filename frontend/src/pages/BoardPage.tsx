import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Task, TaskType } from '@/types';
import { Plus, GitBranch, Eye, Filter, ChevronDown, AlertTriangle } from 'lucide-react';
import { TaskEditModal } from '@/components/TaskEditModal';
import { useClickOutside } from '@/hooks';
import {
  FormModal,
  TextInput,
  Textarea,
  SelectInput,
  Checkbox,
} from '@/components/ui';

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

  // Use click outside hook instead of manual useEffect
  useClickOutside(displaySettingsRef, () => setShowDisplaySettings(false), showDisplaySettings);

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

  const { data: tasks } = useQuery({
    queryKey: ['tasks', selectedTeam?.id],
    queryFn: () => api.tasks.list({ team_id: selectedTeam?.id, page_size: 100 }),
    enabled: !!selectedTeam?.id,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list({ page_size: 100 }),
  });

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
                  <Checkbox
                    label="Show ID"
                    checked={cardDisplay.showId}
                    onChange={(e) => setCardDisplay({ ...cardDisplay, showId: e.target.checked })}
                  />
                  <Checkbox
                    label="Show Project"
                    checked={cardDisplay.showProject}
                    onChange={(e) => setCardDisplay({ ...cardDisplay, showProject: e.target.checked })}
                  />
                  <Checkbox
                    label="Show Release"
                    checked={cardDisplay.showRelease}
                    onChange={(e) => setCardDisplay({ ...cardDisplay, showRelease: e.target.checked })}
                  />
                  <Checkbox
                    label="Show Blockers"
                    checked={cardDisplay.showBlockers}
                    onChange={(e) => setCardDisplay({ ...cardDisplay, showBlockers: e.target.checked })}
                  />
                  <Checkbox
                    label="Show Github"
                    checked={cardDisplay.showGithub}
                    onChange={(e) => setCardDisplay({ ...cardDisplay, showGithub: e.target.checked })}
                  />
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
                        <TaskCard
                          key={task.id}
                          task={task}
                          cardDisplay={cardDisplay}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => setSelectedTask(task)}
                        />
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
      <CreateTaskModal
        isOpen={showModal}
        teamId={selectedTeam.id}
        taskTypes={taskTypes?.items || []}
        projects={projects?.items || []}
        onClose={() => setShowModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}

// Task Card Component - extracted for cleaner code
interface TaskCardProps {
  task: Task;
  cardDisplay: CardDisplaySettings;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}

function TaskCard({ task, cardDisplay, onDragStart, onClick }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
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
  );
}

// Create Task Modal - using FormModal
interface CreateTaskModalProps {
  isOpen: boolean;
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
}

function CreateTaskModal({
  isOpen,
  teamId,
  taskTypes,
  projects,
  onClose,
  onSubmit,
  isLoading,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskTypeId, setTaskTypeId] = useState<number>(0);
  const [projectId, setProjectId] = useState<number | null>(null);

  // Update taskTypeId when taskTypes changes (e.g., when query data arrives)
  useEffect(() => {
    if (taskTypes.length > 0 && (taskTypeId === 0 || !taskTypes.find(tt => tt.id === taskTypeId))) {
      setTaskTypeId(taskTypes[0].id);
    }
  }, [taskTypes, taskTypeId]);

  const handleSubmit = () => {
    onSubmit({
      title,
      description: description || undefined,
      team_id: teamId,
      task_type_id: taskTypeId,
      project_id: projectId || undefined,
    });
    // Reset form
    setTitle('');
    setDescription('');
    setTaskTypeId(taskTypes[0]?.id || 0);
    setProjectId(null);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create Task"
      submitLabel="Create"
      loadingLabel="Creating..."
      isLoading={isLoading}
      isDisabled={!taskTypeId || !title.trim()}
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
          label="Type"
          value={taskTypeId}
          onChange={(e) => setTaskTypeId(Number(e.target.value))}
          options={taskTypes.map(tt => ({ value: tt.id, label: tt.name }))}
        />
        
        <SelectInput
          label="Project (Optional)"
          value={projectId || ''}
          onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
          options={projects.map(p => ({ value: p.id, label: p.title }))}
          placeholder="No Project"
        />
        
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a description..."
        />
      </div>
    </FormModal>
  );
}
