import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { ProjectTypeField, FieldType } from '@/types';
import { Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronUp, X } from 'lucide-react';

export function ProjectTypesSettings() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<{ id: number; name: string; slug: string; workflow: string[]; description?: string | null; fields?: ProjectTypeField[] } | null>(null);
  const [editTypeStats, setEditTypeStats] = useState<{ total_projects: number; projects_by_status: Record<string, number>; workflow: string[] } | null>(null);
  const [deleteType, setDeleteType] = useState<{ id: number; name: string } | null>(null);
  const [typeStats, setTypeStats] = useState<{ total_projects: number; projects_by_status: Record<string, number>; workflow: string[] } | null>(null);
  const [targetTypeId, setTargetTypeId] = useState<number | null>(null);
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>({});
  const [expandedTypeId, setExpandedTypeId] = useState<number | null>(null);

  const { data: projectTypes, isLoading } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: () => api.projectTypes.list(),
  });

  // Fetch full project type with fields when expanded
  const { data: expandedProjectType } = useQuery({
    queryKey: ['projectType', expandedTypeId],
    queryFn: () => expandedTypeId ? api.projectTypes.get(expandedTypeId) : null,
    enabled: !!expandedTypeId,
  });

  const createMutation = useMutation({
    mutationFn: api.projectTypes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; description: string; workflow: string[] }> }) =>
      api.projectTypes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      queryClient.invalidateQueries({ queryKey: ['projectType', editingType?.id] });
      setEditingType(null);
      setEditTypeStats(null);
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: ({ projectTypeId, data }: { projectTypeId: number; data: { key: string; label: string; field_type: string; options?: string[]; required?: boolean; order?: number } }) =>
      api.projectTypes.addField(projectTypeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectType', variables.projectTypeId] });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ projectTypeId, fieldId, data }: { projectTypeId: number; fieldId: number; data: { label?: string; options?: string[]; required?: boolean; order?: number } }) =>
      api.projectTypes.updateField(projectTypeId, fieldId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectType', variables.projectTypeId] });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: ({ projectTypeId, fieldId }: { projectTypeId: number; fieldId: number }) =>
      api.projectTypes.deleteField(projectTypeId, fieldId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectType', variables.projectTypeId] });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: ({ id, targetTypeId, statusMappings }: { id: number; targetTypeId: number; statusMappings: Array<{ old_status: string; new_status: string }> }) =>
      api.projectTypes.migrate(id, targetTypeId, statusMappings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      deleteMutation.mutate(deleteType!.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.projectTypes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      setDeleteType(null);
      setTypeStats(null);
      setTargetTypeId(null);
      setStatusMappings({});
    },
  });

  const handleEditClick = async (pt: { id: number; name: string; slug: string; workflow: string[]; description?: string | null }) => {
    try {
      const [stats, fullType] = await Promise.all([
        api.projectTypes.getStats(pt.id),
        api.projectTypes.get(pt.id),
      ]);
      setEditTypeStats(stats);
      setEditingType(fullType);
    } catch (error) {
      console.error('Failed to get project type stats:', error);
    }
  };

  const handleDeleteClick = async (pt: { id: number; name: string }) => {
    try {
      const stats = await api.projectTypes.getStats(pt.id);
      setTypeStats(stats);
      setDeleteType(pt);
    } catch (error) {
      console.error('Failed to get project type stats:', error);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteType || !typeStats) return;
    
    if (typeStats.total_projects > 0) {
      if (!targetTypeId) {
        alert('Please select a target project type for migration');
        return;
      }
      const mappings = Object.entries(statusMappings).map(([old_status, new_status]) => ({ old_status, new_status }));
      migrateMutation.mutate({ id: deleteType.id, targetTypeId, statusMappings: mappings });
    } else {
      deleteMutation.mutate(deleteType.id);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedTypeId(expandedTypeId === id ? null : id);
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />;
  }

  const targetType = projectTypes?.items?.find(pt => pt.id === targetTypeId);

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
          <div key={pt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{pt.name}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">@{pt.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditClick(pt)} className="p-1 text-gray-400 hover:text-gray-600" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeleteClick(pt)} className="p-1 text-red-400 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Workflow States */}
              <div className="mb-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workflow States</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pt.workflow?.map((status, i) => (
                    <span key={i} className="inline-flex px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {status}
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Fields Toggle */}
              <button
                onClick={() => toggleExpanded(pt.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom Fields
                  </span>
                  {expandedTypeId === pt.id && expandedProjectType?.fields && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({expandedProjectType.fields.length} {expandedProjectType.fields.length === 1 ? 'field' : 'fields'})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                  <span className="text-xs">{expandedTypeId === pt.id ? 'Hide' : 'Manage'}</span>
                  {expandedTypeId === pt.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
            </div>

            {/* Expanded Section - Fields */}
            {expandedTypeId === pt.id && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                <ProjectTypeFieldsManager
                  projectTypeId={pt.id}
                  fields={expandedProjectType?.fields || []}
                  onAddField={(data) => addFieldMutation.mutate({ projectTypeId: pt.id, data })}
                  onUpdateField={(fieldId, data) => updateFieldMutation.mutate({ projectTypeId: pt.id, fieldId, data })}
                  onDeleteField={(fieldId) => deleteFieldMutation.mutate({ projectTypeId: pt.id, fieldId })}
                  isLoading={addFieldMutation.isPending || updateFieldMutation.isPending || deleteFieldMutation.isPending}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <ProjectTypeModal onClose={() => setShowModal(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      )}

      {editingType && editTypeStats && (
        <ProjectTypeEditModal
          projectType={editingType}
          stats={editTypeStats}
          onClose={() => { setEditingType(null); setEditTypeStats(null); }}
          onSubmit={(data) => updateMutation.mutate({ id: editingType.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {deleteType && typeStats && (
        <ProjectTypeDeleteModal
          projectType={deleteType}
          stats={typeStats}
          projectTypes={projectTypes?.items?.filter(pt => pt.id !== deleteType.id) || []}
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

// Fields Manager Component
function ProjectTypeFieldsManager({
  projectTypeId,
  fields,
  onAddField,
  onUpdateField,
  onDeleteField,
  isLoading,
}: {
  projectTypeId: number;
  fields: ProjectTypeField[];
  onAddField: (data: { key: string; label: string; field_type: string; options?: string[]; required?: boolean; order?: number }) => void;
  onUpdateField: (fieldId: number, data: { label?: string; options?: string[]; required?: boolean; order?: number }) => void;
  onDeleteField: (fieldId: number) => void;
  isLoading: boolean;
}) {
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<ProjectTypeField | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<ProjectTypeField | null>(null);

  const FIELD_TYPES: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Select (Dropdown)' },
    { value: 'multiselect', label: 'Multi-Select' },
    { value: 'url', label: 'URL' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Checkbox' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Fields</h4>
        <button
          onClick={() => setShowAddField(true)}
          disabled={isLoading}
          className="inline-flex items-center px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No custom fields defined. Add fields to capture additional project data.</p>
      ) : (
        <div className="space-y-2">
          {fields.sort((a, b) => a.order - b.order).map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{field.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      {field.key}
                    </span>
                    {field.required && (
                      <span className="text-xs text-red-500">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{field.field_type.replace('_', ' ')}</span>
                    {field.options && field.options.length > 0 && (
                      <span>• {field.options.length} options</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingField(field)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFieldToDelete(field)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Field Modal */}
      {showAddField && (
        <FieldFormModal
          title="Add Custom Field"
          fieldTypes={FIELD_TYPES}
          onClose={() => setShowAddField(false)}
          onSubmit={(data) => {
            onAddField({ ...data, order: fields.length });
            setShowAddField(false);
          }}
          isLoading={isLoading}
        />
      )}

      {/* Delete Field Confirm Modal */}
      <ConfirmModal
        isOpen={!!fieldToDelete}
        onClose={() => setFieldToDelete(null)}
        onConfirm={() => {
          if (fieldToDelete) {
            onDeleteField(fieldToDelete.id);
            setFieldToDelete(null);
          }
        }}
        title="Delete Field"
        message={`Are you sure you want to delete the field "${fieldToDelete?.label}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Edit Field Modal */}
      {editingField && (
        <FieldFormModal
          title="Edit Custom Field"
          fieldTypes={FIELD_TYPES}
          initialData={editingField}
          onClose={() => setEditingField(null)}
          onSubmit={(data) => {
            onUpdateField(editingField.id, {
              label: data.label,
              options: data.options,
              required: data.required,
            });
            setEditingField(null);
          }}
          isLoading={isLoading}
          isEdit
        />
      )}
    </div>
  );
}

// Field Form Modal
function FieldFormModal({
  title,
  fieldTypes,
  initialData,
  onClose,
  onSubmit,
  isLoading,
  isEdit = false,
}: {
  title: string;
  fieldTypes: { value: FieldType; label: string }[];
  initialData?: ProjectTypeField;
  onClose: () => void;
  onSubmit: (data: { key: string; label: string; field_type: string; options?: string[]; required?: boolean }) => void;
  isLoading: boolean;
  isEdit?: boolean;
}) {
  const [key, setKey] = useState(initialData?.key || '');
  const [label, setLabel] = useState(initialData?.label || '');
  const [fieldType, setFieldType] = useState<FieldType>(initialData?.field_type || 'text');
  const [options, setOptions] = useState<string[]>(initialData?.options || []);
  const [newOption, setNewOption] = useState('');
  const [required, setRequired] = useState(initialData?.required || false);

  const needsOptions = fieldType === 'select' || fieldType === 'multiselect';

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (opt: string) => {
    setOptions(options.filter(o => o !== opt));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      key: isEdit ? initialData!.key : key,
      label,
      field_type: fieldType,
      options: needsOptions ? options : undefined,
      required,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Field Key
                </label>
                <input
                  type="text"
                  required
                  pattern="^[a-z_][a-z0-9_]*$"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="e.g., priority, due_date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and underscores only</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Label
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Priority, Due Date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Field Type
                </label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as FieldType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {fieldTypes.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
            )}

            {needsOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Options
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                    placeholder="Add option..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <span
                      key={opt}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {options.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Add at least one option</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="required" className="text-sm text-gray-700 dark:text-gray-300">
                Required field
              </label>
            </div>

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
                disabled={isLoading || (needsOptions && options.length === 0)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Add Field'}
              </button>
            </div>
          </form>
        </div>
      </div>
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

function ProjectTypeEditModal({ projectType, stats, onClose, onSubmit, isLoading }: {
  projectType: { id: number; name: string; slug: string; workflow: string[]; description?: string | null };
  stats: { total_projects: number; projects_by_status: Record<string, number>; workflow: string[] };
  onClose: () => void;
  onSubmit: (data: { name?: string; description?: string; workflow?: string[] }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(projectType.name);
  const [description, setDescription] = useState(projectType.description || '');
  const [workflow, setWorkflow] = useState(projectType.workflow.join(', '));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Statuses that have projects and cannot be removed
  const lockedStatuses = Object.entries(stats.projects_by_status)
    .filter(([_, count]) => count > 0)
    .map(([status]) => status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWorkflow = workflow.split(',').map(s => s.trim()).filter(Boolean);
    
    // Check if any locked status is being removed
    const removedLockedStatuses = lockedStatuses.filter(status => !newWorkflow.includes(status));
    
    if (removedLockedStatuses.length > 0) {
      setValidationError(`Cannot remove status "${removedLockedStatuses[0]}" - it has ${stats.projects_by_status[removedLockedStatuses[0]]} active project(s). Migrate projects first.`);
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Project Type</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
              <input type="text" disabled value={projectType.slug} className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500" />
              <p className="text-xs text-gray-500 mt-1">Slug cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workflow</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {projectType.workflow.map((status) => {
                  const count = stats.projects_by_status[status] || 0;
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
                  Statuses with projects (highlighted) cannot be removed
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

function ProjectTypeDeleteModal({
  projectType,
  stats,
  projectTypes,
  targetTypeId,
  setTargetTypeId,
  statusMappings,
  setStatusMappings,
  targetWorkflow,
  onClose,
  onConfirm,
  isLoading
}: {
  projectType: { id: number; name: string };
  stats: { total_projects: number; projects_by_status: Record<string, number>; workflow: string[] };
  projectTypes: Array<{ id: number; name: string; slug: string; workflow: string[] }>;
  targetTypeId: number | null;
  setTargetTypeId: (id: number | null) => void;
  statusMappings: Record<string, string>;
  setStatusMappings: (mappings: Record<string, string>) => void;
  targetWorkflow: string[];
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const statusesWithProjects = Object.entries(stats.projects_by_status).filter(([_, count]) => count > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Project Type</h2>
          
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you sure you want to delete <strong>{projectType.name}</strong>?
            </p>
          </div>

          {stats.total_projects > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This project type has <strong>{stats.total_projects} projects</strong> that need to be migrated.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Migrate projects to:
                </label>
                <select
                  value={targetTypeId || ''}
                  onChange={(e) => {
                    setTargetTypeId(e.target.value ? Number(e.target.value) : null);
                    setStatusMappings({});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select target project type...</option>
                  {projectTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
              </div>

              {targetTypeId && statusesWithProjects.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Map statuses to new workflow:
                  </p>
                  {statusesWithProjects.map(([status, count]) => (
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
              This project type has no projects. It can be safely deleted.
            </p>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={isLoading || (stats.total_projects > 0 && !targetTypeId)}
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