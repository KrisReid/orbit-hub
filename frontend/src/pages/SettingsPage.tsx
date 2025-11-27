import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { 
  Settings, 
  Users, 
  UsersRound, 
  FolderKanban, 
  ListTodo,
  Plus,
  Trash2,
  Pencil
} from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuthStore();

  // Only admins can access settings
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Settings className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Only administrators can access settings.
        </p>
      </div>
    );
  }

  const navItems = [
    { to: 'users', label: 'Users', icon: Users },
    { to: 'teams', label: 'Teams', icon: UsersRound },
    { to: 'project-types', label: 'Project Types', icon: FolderKanban },
    { to: 'task-types', label: 'Task Types', icon: ListTodo },
  ];

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="users" replace />} />
          <Route path="users" element={<UsersSettings />} />
          <Route path="teams" element={<TeamsSettings />} />
          <Route path="project-types" element={<ProjectTypesSettings />} />
          <Route path="task-types" element={<TaskTypesSettings />} />
        </Routes>
      </div>
    </div>
  );
}

function UsersSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  });

  const createMutation = useMutation({
    mutationFn: api.users.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.users.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users?.items?.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                    user.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Delete this user?')) deleteMutation.mutate(user.id);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserModal
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function UserModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: { email: string; full_name: string; password: string; role: 'admin' | 'user' }) => void;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add User</h2>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ email, full_name: fullName, password, role }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TeamsSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

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
            </div>
            {team.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{team.description}</p>}
          </div>
        ))}
      </div>

      {showModal && (
        <TeamModal onClose={() => setShowModal(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
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

function ProjectTypesSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: projectTypes, isLoading } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: () => api.projectTypes.list(),
  });

  const createMutation = useMutation({
    mutationFn: api.projectTypes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      setShowModal(false);
    },
  });

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Types</h2>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
          <Plus className="h-4 w-4 mr-1" />Add Type
        </button>
      </div>

      <div className="space-y-4">
        {projectTypes?.items?.map((pt) => (
          <div key={pt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">{pt.name}</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">@{pt.slug}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pt.workflow?.map((status, i) => (
                <span key={i} className="inline-flex px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  {status}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ProjectTypeModal onClose={() => setShowModal(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      )}
    </div>
  );
}

function ProjectTypeModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: { name: string; slug: string; workflow: string[] }) => void; isLoading: boolean }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [workflow, setWorkflow] = useState('Backlog, In Progress, Done');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Project Type</h2>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, slug, workflow: workflow.split(',').map(s => s.trim()).filter(Boolean) }); }} className="space-y-4">
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
              <input type="text" required value={workflow} onChange={(e) => setWorkflow(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" placeholder="Backlog, In Progress, Done" />
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

function TaskTypesSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

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
