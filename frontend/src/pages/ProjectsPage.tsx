import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Project, ProjectType, ProjectTypeField } from '@/types';
import { Plus, FolderKanban, ExternalLink, X } from 'lucide-react';

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', { project_type_id: filterType, status: filterStatus }],
    queryFn: () => api.projects.list({ 
      project_type_id: filterType || undefined,
      status: filterStatus || undefined,
    }),
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: () => api.projectTypes.list(),
  });

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => api.themes.list(),
  });

  const createMutation = useMutation({
    mutationFn: api.projects.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Invalidate theme queries so new projects appear in theme detail pages
      if (data?.theme_id) {
        queryClient.invalidateQueries({ queryKey: ['theme', String(data.theme_id)] });
      }
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      setShowModal(false);
    },
  });

  // Get unique statuses from project types
  const allStatuses = new Set<string>();
  projectTypes?.items?.forEach(pt => {
    pt.workflow?.forEach(status => allStatuses.add(status));
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Cross-team work items with customizable workflows
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <select
          value={filterType || ''}
          onChange={(e) => setFilterType(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Types</option>
          {projectTypes?.items?.map((pt) => (
            <option key={pt.id} value={pt.id}>{pt.name}</option>
          ))}
        </select>
        <select
          value={filterStatus || ''}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Statuses</option>
          {Array.from(allStatuses).map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* Projects Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Theme
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Updated
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects?.items?.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                      <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Link 
                        to={`/projects/${project.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-primary-600"
                      >
                        {project.title}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: project.project_type?.color ? `${project.project_type.color}20` : undefined,
                      color: project.project_type?.color || undefined
                    }}
                  >
                    {project.project_type?.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {project.theme?.title || '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'Done' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : project.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(project.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {projects?.items?.length === 0 && (
          <div className="text-center py-12">
            <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No projects</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new project.
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <ProjectModal
          projectTypes={projectTypes?.items || []}
          themes={themes?.items || []}
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function ProjectModal({
  projectTypes,
  themes,
  onClose,
  onSubmit,
  isLoading,
}: {
  projectTypes: ProjectType[];
  themes: { id: number; title: string }[];
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string; project_type_id: number; theme_id?: number; custom_data?: Record<string, unknown> }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectTypeId, setProjectTypeId] = useState<number>(projectTypes[0]?.id || 0);
  const [themeId, setThemeId] = useState<number | null>(null);
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  // Fetch full project type with fields when selection changes
  const { data: selectedProjectType } = useQuery({
    queryKey: ['projectType', projectTypeId],
    queryFn: () => projectTypeId ? api.projectTypes.get(projectTypeId) : null,
    enabled: !!projectTypeId,
  });

  // Reset custom data when project type changes
  useEffect(() => {
    setCustomData({});
  }, [projectTypeId]);

  const handleCustomFieldChange = (key: string, value: unknown) => {
    setCustomData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      project_type_id: projectTypeId,
      theme_id: themeId || undefined,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    });
  };

  const renderCustomFieldInput = (field: ProjectTypeField) => {
    const value = customData[field.key];
    const baseClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
            className={baseClass}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={String(value || '')}
            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
            rows={3}
            className={baseClass}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => handleCustomFieldChange(field.key, e.target.value ? Number(e.target.value) : null)}
            className={baseClass}
          />
        );
      case 'select':
        return (
          <select
            value={String(value || '')}
            onChange={(e) => handleCustomFieldChange(field.key, e.target.value || null)}
            className={baseClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-h-32 overflow-y-auto">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v) => v !== opt);
                    handleCustomFieldChange(field.key, newValues);
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'url':
        return (
          <input
            type="url"
            value={String(value || '')}
            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
            placeholder="https://"
            className={baseClass}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value ? String(value).split('T')[0] : ''}
            onChange={(e) => handleCustomFieldChange(field.key, e.target.value || null)}
            className={baseClass}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
          </label>
        );
      default:
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
            className={baseClass}
          />
        );
    }
  };

  const customFields = selectedProjectType?.fields || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create Project
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
                Project Type
              </label>
              <select
                value={projectTypeId}
                onChange={(e) => setProjectTypeId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {projectTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Theme (Optional)
              </label>
              <select
                value={themeId || ''}
                onChange={(e) => setThemeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">No Theme</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.title}</option>
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

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Custom Fields
                </h3>
                <div className="space-y-4">
                  {customFields.sort((a, b) => a.order - b.order).map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderCustomFieldInput(field)}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                disabled={isLoading || !projectTypeId}
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
