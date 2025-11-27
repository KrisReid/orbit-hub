import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Task, TaskType } from '@/types';
import { Plus, GitBranch, ExternalLink } from 'lucide-react';

export function BoardPage() {
  const { teamSlug } = useParams<{ teamSlug?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  // Get workflow from first task type (or default)
  const workflow = taskTypes?.items?.[0]?.workflow || ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

  // Group tasks by status
  const tasksByStatus = workflow.reduce((acc, status) => {
    acc[status] = tasks?.items?.filter(t => t.status === status) || [];
    return acc;
  }, {} as Record<string, Task[]>);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Board</h1>
          <select
            value={selectedTeam?.slug || ''}
            onChange={(e) => navigate(`/board/${e.target.value}`)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {teams?.items?.map((team) => (
              <option key={team.id} value={team.slug}>{team.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {workflow.map((status) => (
          <div
            key={status}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  {status}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {tasksByStatus[status]?.length || 0}
                </span>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {tasksByStatus[status]?.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-primary-600 dark:text-primary-400">
                        {task.display_id}
                      </span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: task.task_type?.color ? `${task.task_type.color}20` : undefined,
                          color: task.task_type?.color || undefined
                        }}
                      >
                        {task.task_type?.name}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      {task.title}
                    </p>
                    {task.project && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {task.project.title}
                      </p>
                    )}
                    {task.github_links && task.github_links.length > 0 && (
                      <div className="mt-2 flex items-center text-xs text-gray-400">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {task.github_links.length} PR{task.github_links.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          workflow={workflow}
          onClose={() => setSelectedTask(null)}
          onUpdate={(data) => {
            updateMutation.mutate({ id: selectedTask.id, data });
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

function TaskDetailModal({
  task,
  workflow,
  onClose,
  onUpdate,
}: {
  task: Task;
  workflow: string[];
  onClose: () => void;
  onUpdate: (data: { status: string }) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-primary-600 dark:text-primary-400">
              {task.display_id}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: task.task_type?.color ? `${task.task_type.color}20` : undefined,
                color: task.task_type?.color || undefined
              }}
            >
              {task.task_type?.name}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {task.title}
          </h2>
          {task.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {task.description}
            </p>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={task.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {workflow.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          {/* GitHub Links */}
          {task.github_links && task.github_links.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Linked PRs
              </h3>
              <div className="space-y-2">
                {task.github_links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center space-x-2">
                      <GitBranch className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        #{link.pr_number}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {link.pr_title}
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Close
            </button>
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
