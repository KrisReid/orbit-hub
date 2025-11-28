import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ThemeStatus } from '@/types';
import { ArrowLeft, Trash2, FolderKanban } from 'lucide-react';

export function ThemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: theme, isLoading } = useQuery({
    queryKey: ['theme', id],
    queryFn: () => api.themes.get(Number(id!)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status?: ThemeStatus; title?: string; description?: string }) =>
      api.themes.update(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme', id] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      setEditingTitle(false);
      setEditingDescription(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.themes.delete(Number(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      navigate('/themes');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Theme not found</p>
      </div>
    );
  }

  const handleTitleSave = () => {
    updateMutation.mutate({ title });
  };

  const handleDescriptionSave = () => {
    updateMutation.mutate({ description });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this theme? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  // Get the workflow for themes
  const workflow: ThemeStatus[] = ['active', 'completed', 'archived'];
  const currentStatusIndex = workflow.indexOf(theme.status);

  const getStepState = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stepIndex < currentStatusIndex) return 'completed';
    if (stepIndex === currentStatusIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/themes"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Themes
            </span>
          </div>
          
          {/* Editable Title */}
          {editingTitle ? (
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-3xl font-bold px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter theme title..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTitleSave}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingTitle(false);
                    setTitle(theme.title);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h1
              onClick={() => {
                setTitle(theme.title);
                setEditingTitle(true);
              }}
              className="text-3xl font-bold text-gray-900 dark:text-white mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-2 py-1 -mx-2 rounded-lg transition-colors"
            >
              {theme.title}
            </h1>
          )}
        </div>
        
        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Description
            </h2>
            {editingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter theme description..."
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
                      setDescription(theme.description || '');
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
                  setDescription(theme.description || '');
                  setEditingDescription(true);
                }}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[100px] flex items-center"
              >
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {theme.description || <span className="text-gray-500 italic">Click to add description...</span>}
                </p>
              </div>
            )}
          </div>

          {/* Linked Projects */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Linked Projects ({theme.projects?.length || 0})
              </h2>
            </div>
            {theme.projects && theme.projects.length > 0 ? (
              <div className="space-y-2">
                {theme.projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{project.title}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      project.status === 'Done'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : project.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {project.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No projects linked to this theme yet. Create a project and select this theme to link it.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Status
            </h3>
            <div className="space-y-3">
              {workflow.map((status, index) => {
                const stepState = getStepState(index);
                return (
                  <button
                    key={status}
                    onClick={() => updateMutation.mutate({ status })}
                    disabled={updateMutation.isPending}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-50 ${
                      stepState === 'current'
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div
                      className={`h-3 w-3 rounded-full flex-shrink-0 ${
                        stepState === 'completed'
                          ? 'bg-green-500'
                          : stepState === 'current'
                          ? 'bg-primary-600'
                          : 'border-2 border-gray-300 dark:border-gray-500 bg-transparent'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium capitalize ${
                        stepState === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : stepState === 'current'
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Info
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(theme.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Updated</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(theme.updated_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}