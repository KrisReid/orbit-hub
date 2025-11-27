import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(Number(id!)),
    enabled: !!id,
  });

  const { data: projectType } = useQuery({
    queryKey: ['projectType', project?.project_type?.id],
    queryFn: () => api.projectTypes.get(project!.project_type!.id),
    enabled: !!project?.project_type?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; description?: string }) =>
      api.projects.update(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setEditingDescription(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Project not found</p>
      </div>
    );
  }

  const handleDescriptionSave = () => {
    updateMutation.mutate({ description });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/projects"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {project.theme?.title} / {project.project_type?.name}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {project.title}
          </h1>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={project.status}
            onChange={(e) => updateMutation.mutate({ status: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
          >
            {(projectType?.workflow || project.project_type?.workflow)?.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description & Context */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Description & Context
            </h2>
            {editingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter project description..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDescriptionSave}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingDescription(false);
                      setDescription(project.description || '');
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setDescription(project.description || '');
                  setEditingDescription(true);
                }}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[100px] flex items-center"
              >
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {project.description || <span className="text-gray-500 italic">Click to add description...</span>}
                </p>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {projectType?.fields && projectType.fields.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Project Metadata
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projectType.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label}
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {project.custom_data?.[field.key] ? String(project.custom_data[field.key]) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sequencing & Dependencies
            </h2>
            {project.dependencies && project.dependencies.length > 0 ? (
              <div className="space-y-2 mb-4">
                {project.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <Link
                      to={`/projects/${dep.id}`}
                      className="text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      <div>
                        <p className="font-medium">{dep.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{dep.status}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                No dependencies defined
              </p>
            )}
            <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
              + Add dependency
            </button>
          </div>

          {/* Linked Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Linked Tasks ({project.tasks?.length || 0})
              </h2>
              <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>
            {project.tasks && project.tasks.length > 0 ? (
              <div className="space-y-2">
                {project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-mono text-sm text-primary-600 dark:text-primary-400">
                        {task.display_id}
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white">{task.title}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      task.status === 'Done'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tasks linked to this project yet
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow State */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Workflow State
            </h3>
            <div className="space-y-3">
              {(projectType?.workflow || project.project_type?.workflow)?.map((status) => (
                <button
                  key={status}
                  onClick={() => updateMutation.mutate({ status })}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    project.status === status
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div
                    className={`h-3 w-3 rounded-full ${
                      project.status === status
                        ? 'bg-primary-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      project.status === status
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Info
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {project.project_type?.name}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Theme</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {project.theme?.title || '—'}
                </dd>
              </div>
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