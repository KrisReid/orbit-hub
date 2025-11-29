import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ProjectTypeField } from '@/types';
import { ArrowLeft, Plus, Trash2, Pencil, X, Check } from 'lucide-react';

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
    mutationFn: (data: { status?: string; description?: string; custom_data?: Record<string, unknown> }) =>
      api.projects.update(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Invalidate theme queries so project status updates appear live in theme detail pages
      if (project?.theme_id) {
        queryClient.invalidateQueries({ queryKey: ['theme', String(project.theme_id)] });
      }
      // Also invalidate the themes list in case status changes affect displays there
      queryClient.invalidateQueries({ queryKey: ['themes'] });
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

  // Get workflow array and current status index
  const workflow = projectType?.workflow || project.project_type?.workflow || [];
  const currentStatusIndex = workflow.indexOf(project.status);

  // Helper to determine the state of each workflow step
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
            <CustomFieldsSection
              fields={projectType.fields}
              customData={project.custom_data || {}}
              onSave={(newCustomData) => updateMutation.mutate({ custom_data: newCustomData })}
              isLoading={updateMutation.isPending}
            />
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
                      className={`text-sm font-medium ${
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

// Custom Fields Section Component
function CustomFieldsSection({
  fields,
  customData,
  onSave,
  isLoading,
}: {
  fields: ProjectTypeField[];
  customData: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setEditData(customData);
  }, [customData]);

  const handleStartEdit = () => {
    setEditData({ ...customData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData(customData);
    setIsEditing(false);
  };

  const handleSave = () => {
    onSave(editData);
    setIsEditing(false);
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const renderFieldValue = (field: ProjectTypeField, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Not set</span>;
    }

    switch (field.field_type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'url':
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            {String(value)}
          </a>
        );
      case 'date':
        return new Date(String(value)).toLocaleDateString();
      default:
        return String(value);
    }
  };

  const renderFieldInput = (field: ProjectTypeField) => {
    const value = editData[field.key];
    const baseClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className={baseClass}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            rows={3}
            className={baseClass}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : null)}
            className={baseClass}
          />
        );
      case 'select':
        return (
          <select
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.key, e.target.value || null)}
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
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v) => v !== opt);
                    handleFieldChange(field.key, newValues);
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
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder="https://"
            className={baseClass}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value ? String(value).split('T')[0] : ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value || null)}
            className={baseClass}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
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
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className={baseClass}
          />
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Custom Fields
        </h2>
        {!isEditing ? (
          <button
            onClick={handleStartEdit}
            className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 rounded"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.sort((a, b) => a.order - b.order).map((field) => (
          <div key={field.key} className={field.field_type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {isEditing ? (
              renderFieldInput(field)
            ) : (
              <div className="text-sm text-gray-900 dark:text-white py-2">
                {renderFieldValue(field, customData[field.key])}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}