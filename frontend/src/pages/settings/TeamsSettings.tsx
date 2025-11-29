import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function TeamsSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{ id: number; name: string; slug: string; description?: string | null } | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<{ id: number; name: string } | null>(null);
  const [teamStats, setTeamStats] = useState<{ task_count: number; task_type_count: number; is_unassigned_team: boolean } | null>(null);
  const [reassignTo, setReassignTo] = useState<number | undefined>(undefined);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.teams.list(),
  });

  const createMutation = useMutation({
    mutationFn: api.teams.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; description: string }> }) =>
      api.teams.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setEditingTeam(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reassignTasksTo }: { id: number; reassignTasksTo?: number }) =>
      api.teams.delete(id, reassignTasksTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setDeleteTeam(null);
      setTeamStats(null);
    },
  });

  const handleDeleteClick = async (team: { id: number; name: string; slug: string }) => {
    try {
      const stats = await api.teams.getStats(team.id);
      setTeamStats(stats);
      setDeleteTeam(team);
    } catch (error) {
      console.error('Failed to get team stats:', error);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Teams</h2>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
          <Plus className="h-4 w-4 mr-1" />Add Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams?.items?.map((team) => (
          <div key={team.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{team.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{team.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTeam(team)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {team.slug !== 'unassigned' && (
                  <button
                    onClick={() => handleDeleteClick(team)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {team.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{team.description}</p>}
          </div>
        ))}
      </div>

      {showModal && (
        <TeamModal onClose={() => setShowModal(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      )}

      {editingTeam && (
        <TeamEditModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingTeam.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {deleteTeam && teamStats && (
        <TeamDeleteModal
          team={deleteTeam}
          stats={teamStats}
          teams={teams?.items?.filter(t => t.id !== deleteTeam.id) || []}
          reassignTo={reassignTo}
          setReassignTo={setReassignTo}
          onClose={() => { setDeleteTeam(null); setTeamStats(null); setReassignTo(undefined); }}
          onConfirm={() => deleteMutation.mutate({ id: deleteTeam.id, reassignTasksTo: reassignTo })}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function TeamModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: { name: string; slug: string; description?: string }) => void; isLoading: boolean }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Team</h2>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, slug, description: description || undefined }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input type="text" required value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); }} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
              <input type="text" required pattern="[a-z0-9-]+" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">{isLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TeamEditModal({ team, onClose, onSubmit, isLoading }: {
  team: { id: number; name: string; slug: string; description?: string | null };
  onClose: () => void;
  onSubmit: (data: { name?: string; description?: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Team</h2>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, description: description || undefined }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
              <input type="text" disabled value={team.slug} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500" />
              <p className="text-xs text-gray-500 mt-1">Slug cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
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

function TeamDeleteModal({
  team,
  stats,
  teams,
  reassignTo,
  setReassignTo,
  onClose,
  onConfirm,
  isLoading
}: {
  team: { id: number; name: string };
  stats: { task_count: number; task_type_count: number; is_unassigned_team: boolean };
  teams: Array<{ id: number; name: string; slug: string }>;
  reassignTo: number | undefined;
  setReassignTo: (id: number | undefined) => void;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Team</h2>
          
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you sure you want to delete <strong>{team.name}</strong>?
            </p>
          </div>

          {stats.task_count > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This team has <strong>{stats.task_count} tasks</strong> and <strong>{stats.task_type_count} task types</strong>.
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reassign tasks to:
              </label>
              <select
                value={reassignTo || ''}
                onChange={(e) => setReassignTo(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Unassigned Team (default)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Task types will be deleted. Tasks will be migrated to the target team's default task type.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}