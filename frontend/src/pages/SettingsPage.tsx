import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import {
  UsersSettings,
  TeamsSettings,
  ThemesSettings,
  ProjectTypesSettings,
  TaskTypesSettings,
} from './settings';
import {
  Settings,
  Users,
  UsersRound,
  FolderKanban,
  ListTodo,
  Target,
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
    { to: 'themes', label: 'Themes', icon: Target },
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
          <Route path="themes" element={<ThemesSettings />} />
          <Route path="project-types" element={<ProjectTypesSettings />} />
          <Route path="task-types" element={<TaskTypesSettings />} />
        </Routes>
      </div>
    </div>
  );
}
