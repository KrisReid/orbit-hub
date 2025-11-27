import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ArrowLeft, ListTodo, Link2, GitBranch } from 'lucide-react';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(Number(id)),
    enabled: !!id,
  });

  const { data: projectType } = useQuery({
    queryKey: ['projectType', project?.project_type_id],
    queryFn: () => api.projectTypes.get(project!.project_type_id),
    enabled: !!project?.project_type_id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ data }: { data: { status?: string } }) =>
      api.projects.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/projects"
        className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <span 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: project.project_type?.color ? `${project.project_type.color}20` : undefined,
                  color: project.project_type?.color || undefined
                }}
              >
                {project.project_type?.name}
              </span>
              {project.theme && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  in {project.theme.title}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {project.title}
            </h1>
            {project.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {project.description}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={project.status}
              onChange={(e) => updateMutation.mutate({ data: { status: e.target.value } })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {projectType?.workflow?.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Fields */}
          {projectType?.fields && projectType.fields.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Details
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projectType.fields.map((field) => (
                  <div key={field.key}>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {field.label}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {project.custom_data?.[field.key] || '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tasks
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {project.tasks?.length || 0} tasks
              </span>
            </div>
            <div className="space-y-2">
              {project.tasks?.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <ListTodo className="h-4 w-4 text-gray-400" />
                    <span className="font-mono text-sm text-primary-600 dark:text-primary-400">
                      {task.display_id}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {task.title}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    task.status === 'Done' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {task.status}
                  </span>
                </div>
              )) || (
                <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No tasks linked to this project yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dependencies */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Link2 className="h-5 w-5 mr-2" />
              Dependencies
            </h2>
            {project.dependencies && project.dependencies.length > 0 ? (
              <div className="space-y-2">
                {project.dependencies.map((dep) => (
                  <Link
                    key={dep.id}
                    to={`/projects/${dep.id}`}
                    className="block p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {dep.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dep.status}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No dependencies
              </p>
            )}
          </div>

          {/* Blocked By */}
          {project.dependents && project.dependents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Blocking
              </h2>
              <div className="space-y-2">
                {project.dependents.map((dep) => (
                  <Link
                    key={dep.id}
                    to={`/projects/${dep.id}`}
                    className="block p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {dep.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Info
            </h2>
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
    </div>
  );
}
