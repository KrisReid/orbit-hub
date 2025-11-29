import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function TaskTypesSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<{ id: number; name: string; slug: string; workflow: string[]; description?: string | null; team_id: number } | null>(null);
  const [editTypeStats, setEditTypeStats] = useState<{ total_tasks: number; tasks_by_status: Record<string, number>; workflow: string[]; team_id: number } | null>(null);
  const [deleteType, setDeleteType] = useState<{ id: number; name: string; team_id: number } | null>(null);
  const [typeStats, setTypeStats] = useState<{ total_tasks: number; tasks_by_status: Record<string, number>; workflow: string[]; team_id: number } | null>(null);
  const [targetTypeId, setTargetTypeId] = useState<number | null>(null);
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>({});

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.teams.list(),
  });

  const { data: taskTypes, isLoading } = useQuery({
    queryKey: ['taskTypes'],
    queryFn: () => api.taskTypes.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; workflow: string[]; team_id: number }) =>
      api.taskTypes.create(data.team_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; description: string; workflow: string[] }> }) =>
      api.taskTypes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
      setEditingType(null);
      setEditTypeStats(null);
    },
  });

  const migrateMutation = useMutation({
    mutationFn: ({ id, targetTypeId, statusMappings }: { id: number; targetTypeId: number; statusMappings: Array<{ old_status: string; new_status: string }> }) =>
      api.taskTypes.migrate(id, targetTypeId, statusMappings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
      deleteMutation.mutate(deleteType!.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.taskTypes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
      setDeleteType(null);
      setTypeStats(null);
      setTargetTypeId(null);
      setStatusMappings({});
    },
  });

  const handleEditClick = async (tt: { id: number; name: string; slug: string; workflow: string[]; description?: string | null; team_id: number }) => {
    try {
      const stats = await api.taskTypes.getStats(tt.id);
      setEditTypeStats(stats);
      setEditingType(tt);
    } catch (error) {
      console.error('Failed to get task type stats:', error);
    }
  };

  const handleDeleteClick = async (tt: { id: number; name: string; team_id: number }) => {
    try {
      const stats = await api.taskTypes.getStats(tt.id);
      setTypeStats(stats);
      setDeleteType(tt);
    } catch (error) {
      console.error('Failed to get task type stats:', error);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteType || !typeStats) return;
    
    if (typeStats.total_tasks > 0) {
      if (!targetTypeId) {
        alert('Please select a target task type for migration');
        return;
      }
      const mappings = Object.entries(statusMappings).map(([old_status, new_status]) => ({ old_status, new_status }));
      migrateMutation.mutate({ id: deleteType.id, targetTypeId, statusMappings: mappings });
    } else {
      deleteMutation.mutate(deleteType.id);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />;
  }

  // Group task types by team
  const byTeam = taskTypes?.items?.reduce((acc, tt) => {
    const teamId = tt.team_id;
    if (!acc[teamId]) acc[teamId] = [];
    acc[teamId].push(tt);
    return acc;
  }, {} as Record<number, typeof taskTypes.items>) || {};

  const targetType = taskTypes?.items?.find(tt => tt.id === targetTypeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Types</h2>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
          <Plus className="h-4 w-4 mr-1" />Add Type
        </button>
      </div>

      {teams?.items?.map((team) => (
        <div key={team.id} className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{team.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byTeam[team.id]?.map((tt) => (
              <div key={tt.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{tt.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">@{tt.slug}</span>
                    <button onClick={() => handleEditClick(tt)} className="p-1 text-gray-400 hover:text-gray-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteClick(tt)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tt.workflow?.map((status, i) => (
                    <span key={i} className="inline-flex px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">{status}</span>
                  ))}
                </div>
              </div>
            )) || <p className="text-sm text-gray-500 col-span-2">No task types for this team</p>}
          </div>
        </div>
      ))}

      {showModal && (
        <TaskTypeModal teams={teams?.items || []} onClose={() => setShowModal(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      )}

      {editingType && editTypeStats && (
        <TaskTypeEditModal
          taskType={editingType}
          stats={editTypeStats}
          onClose={() => { setEditingType(null); setEditTypeStats(null); }}
          onSubmit={(data) => updateMutation.mutate({ id: editingType.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {deleteType && typeStats && (
        <TaskTypeDeleteModal
          taskType={deleteType}
          stats={typeStats}
          taskTypes={taskTypes?.items?.filter(tt => tt.id !== deleteType.id) || []}
          targetTypeId={targetTypeId}
          setTargetTypeId={setTargetTypeId}
          statusMappings={statusMappings}
          setStatusMappings={setStatusMappings}
          targetWorkflow={targetType?.workflow || []}
          onClose={() => { setDeleteType(null); setTypeStats(null); setTargetTypeId(null); setStatusMappings({}); }}
          onConfirm={handleConfirmDelete}
          isLoading={migrateMutation.isPending || deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function TaskTypeModal({ teams, onClose, onSubmit, isLoading }: { teams: { id: number; name: string }[]; onClose: () => void; onSubmit: (data: { name: string; slug: string; workflow: string[]; team_id: number }) => void; isLoading: boolean }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [workflow, setWorkflow] = useState('Backlog, To Do, In Progress, Done');
  const [teamId, setTeamId] = useState<number>(teams[0]?.id || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Task Type</h2>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, slug, workflow: workflow.split(',').map(s => s.trim()).filter(Boolean), team_id: teamId }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
              <select value={teamId} onChange={(e) => setTeamId(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input type="text" required value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); }} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
              <input type="text" required pattern="[a-z0-9-]+" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workflow (comma-separated)</label>
              <input type="text" required value={workflow} onChange={(e) => setWorkflow(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
              <button type="submit" disabled={isLoading || !teamId} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">{isLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TaskTypeEditModal({ taskType, stats, onClose, onSubmit, isLoading }: {
  taskType: { id: number; name: string; slug: string; workflow: string[]; description?: string | null; team_id: number };
  stats: { total_tasks: number; tasks_by_status: Record<string, number>; workflow: string[]; team_id: number };
  onClose: () => void;
  onSubmit: (data: { name?: string; description?: string; workflow?: string[] }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(taskType.name);
  const [description, setDescription] = useState(taskType.description || '');
  const [workflow, setWorkflow] = useState(taskType.workflow.join(', '));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Statuses that have tasks and cannot be removed
  const lockedStatuses = Object.entries(stats.tasks_by_status)
    .filter(([_, count]) => count > 0)
    .map(([status]) => status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWorkflow = workflow.split(',').map(s => s.trim()).filter(Boolean);
    
    // Check if any locked status is being removed
    const removedLockedStatuses = lockedStatuses.filter(status => !newWorkflow.includes(status));
    
    if (removedLockedStatuses.length > 0) {
      setValidationError(`Cannot remove status "${removedLockedStatuses[0]}" - it has ${stats.tasks_by_status[removedLockedStatuses[0]]} active task(s). Migrate tasks first.`);
      return;
    }
    
    setValidationError(null);
    onSubmit({ name, description: description || undefined, workflow: newWorkflow });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Task Type</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
              <input type="text" disabled value={taskType.slug} className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500" />
              <p className="text-xs text-gray-500 mt-1">Slug cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workflow</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {taskType.workflow.map((status) => {
                  const count = stats.tasks_by_status[status] || 0;
                  const isLocked = count > 0;
                  return (
                    <span
                      key={status}
                      className={`inline-flex items-center px-2 py-1 text-xs rounded ${
                        isLocked
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {status}
                      {isLocked && <span className="ml-1 font-medium">({count})</span>}
                    </span>
                  );
                })}
              </div>
              <input
                type="text"
                required
                value={workflow}
                onChange={(e) => { setWorkflow(e.target.value); setValidationError(null); }}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              />
              {lockedStatuses.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Statuses with tasks (highlighted) cannot be removed
                </p>
              )}
              {validationError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationError}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">{isLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TaskTypeDeleteModal({
  taskType,
  stats,
  taskTypes,
  targetTypeId,
  setTargetTypeId,
  statusMappings,
  setStatusMappings,
  targetWorkflow,
  onClose,
  onConfirm,
  isLoading
}: {
  taskType: { id: number; name: string; team_id: number };
  stats: { total_tasks: number; tasks_by_status: Record<string, number>; workflow: string[]; team_id: number };
  taskTypes: Array<{ id: number; name: string; slug: string; workflow: string[]; team_id: number }>;
  targetTypeId: number | null;
  setTargetTypeId: (id: number | null) => void;
  statusMappings: Record<string, string>;
  setStatusMappings: (mappings: Record<string, string>) => void;
  targetWorkflow: string[];
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const statusesWithTasks = Object.entries(stats.tasks_by_status).filter(([_, count]) => count > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Task Type</h2>
          
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you sure you want to delete <strong>{taskType.name}</strong>?
            </p>
          </div>

          {stats.total_tasks > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This task type has <strong>{stats.total_tasks} tasks</strong> that need to be migrated.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Migrate tasks to:
                </label>
                <select
                  value={targetTypeId || ''}
                  onChange={(e) => {
                    setTargetTypeId(e.target.value ? Number(e.target.value) : null);
                    setStatusMappings({});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select target task type...</option>
                  {taskTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>{tt.name} ({tt.team_id === taskType.team_id ? 'same team' : 'different team'})</option>
                  ))}
                </select>
              </div>

              {targetTypeId && statusesWithTasks.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Map statuses to new workflow:
                  </p>
                  {statusesWithTasks.map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[120px]">
                        {status} ({count})
                      </span>
                      <span className="text-gray-400">→</span>
                      <select
                        value={statusMappings[status] || ''}
                        onChange={(e) => setStatusMappings({ ...statusMappings, [status]: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                      >
                        <option value="">Select status...</option>
                        {targetWorkflow.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This task type has no tasks. It can be safely deleted.
            </p>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={isLoading || (stats.total_tasks > 0 && !targetTypeId)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}