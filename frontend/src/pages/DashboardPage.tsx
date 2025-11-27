import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { 
  FolderKanban, 
  ListTodo, 
  Target, 
  Rocket,
  ArrowRight,
  Clock
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();
  
  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => api.themes.list({ page_size: 5 }),
  });
  
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list({ page_size: 5 }),
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list({ page_size: 10 }),
  });
  
  const { data: releases } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list({ page_size: 5 }),
  });

  const stats = [
    { 
      name: 'Active Themes', 
      value: themes?.total || 0, 
      icon: Target,
      href: '/themes',
      color: 'bg-purple-500'
    },
    { 
      name: 'Projects', 
      value: projects?.total || 0, 
      icon: FolderKanban,
      href: '/projects',
      color: 'bg-blue-500'
    },
    { 
      name: 'Open Tasks', 
      value: tasks?.total || 0, 
      icon: ListTodo,
      href: '/board',
      color: 'bg-green-500'
    },
    { 
      name: 'Releases', 
      value: releases?.total || 0, 
      icon: Rocket,
      href: '/releases',
      color: 'bg-orange-500'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
          >
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.name}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Projects
            </h2>
            <Link 
              to="/projects" 
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects?.items?.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {project.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {project.project_type?.name}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'Done' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : project.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </Link>
            )) || (
              <p className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No projects yet
              </p>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Tasks
            </h2>
            <Link 
              to="/board" 
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View board
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tasks?.items?.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-primary-600 dark:text-primary-400">
                      {task.display_id}
                    </span>
                    <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                      {task.title}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.status === 'Done' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : task.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(task.updated_at).toLocaleDateString()}
                  <span className="mx-2">•</span>
                  {task.team?.name}
                </div>
              </div>
            )) || (
              <p className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No tasks yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
