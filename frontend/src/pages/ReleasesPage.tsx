import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Release, ReleaseStatus } from '@/types';
import { Rocket, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  PageHeader,
  PrimaryActionButton,
  PageLoading,
  EmptyState,
  AutoStatusBadge,
  FormModal,
  EditFormModal,
  TextInput,
  Textarea,
  SelectInput,
  DateInput,
} from '@/components/ui';
import { useEntityModal } from '@/hooks';

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'released', label: 'Released' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Helper to get status icon
function getStatusIcon(status: ReleaseStatus) {
  switch (status) {
    case 'released':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'cancelled':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Calendar className="h-5 w-5 text-gray-500" />;
  }
}

export function ReleasesPage() {
  const queryClient = useQueryClient();
  const modal = useEntityModal<Release>();

  // Form state
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [status, setStatus] = useState<ReleaseStatus>('planned');

  const { data: releases, isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list(),
  });

  const createMutation = useMutation({
    mutationFn: api.releases.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      modal.close();
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Release> }) =>
      api.releases.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      modal.close();
      resetForm();
    },
  });

  const resetForm = () => {
    setVersion('');
    setTitle('');
    setDescription('');
    setTargetDate('');
    setReleaseDate('');
    setStatus('planned');
  };

  const handleOpenCreate = () => {
    resetForm();
    modal.openCreate();
  };

  const handleOpenEdit = (release: Release) => {
    setVersion(release.version);
    setTitle(release.title);
    setDescription(release.description || '');
    setTargetDate(release.target_date || '');
    setReleaseDate(release.release_date || '');
    setStatus(release.status);
    modal.openEdit(release);
  };

  const handleSubmit = () => {
    const data = {
      version,
      title,
      description: description || undefined,
      target_date: targetDate || undefined,
      release_date: releaseDate || undefined,
      status,
    };

    if (modal.mode === 'edit' && modal.entity) {
      updateMutation.mutate({ id: modal.entity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  const isEdit = modal.mode === 'edit';
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Form content (shared between create and edit)
  const FormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="Version"
          required
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="v1.0.0"
        />
        <SelectInput
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReleaseStatus)}
          options={STATUS_OPTIONS}
        />
      </div>
      
      <TextInput
        label="Title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Q4 Feature Release"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <DateInput
          label="Target Date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
        <DateInput
          label="Release Date"
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
        />
      </div>
      
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Releases"
        description="Version management and deployment tracking"
        action={
          <PrimaryActionButton
            label="New Release"
            onClick={handleOpenCreate}
          />
        }
      />

      {/* Releases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {releases?.items?.map((release) => (
          <ReleaseCard
            key={release.id}
            release={release}
            onClick={() => handleOpenEdit(release)}
          />
        ))}
        
        {releases?.items?.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Rocket}
              title="No releases"
              description="Get started by creating a new release."
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      {!isEdit && (
        <FormModal
          isOpen={modal.isOpen}
          onClose={modal.close}
          onSubmit={handleSubmit}
          title="Create Release"
          submitLabel="Create"
          loadingLabel="Creating..."
          isLoading={isPending}
        >
          {FormContent}
        </FormModal>
      )}

      {/* Edit Modal */}
      {isEdit && (
        <EditFormModal
          isOpen={modal.isOpen}
          onClose={modal.close}
          onSubmit={handleSubmit}
          title="Edit Release"
          isLoading={isPending}
        >
          {FormContent}
        </EditFormModal>
      )}
    </div>
  );
}

// Release Card Component
function ReleaseCard({
  release,
  onClick,
}: {
  release: Release;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:border-primary-500 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
            <Rocket className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {release.version}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {release.title}
            </p>
          </div>
        </div>
        {getStatusIcon(release.status)}
      </div>
      
      {release.description && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {release.description}
        </p>
      )}
      
      <div className="mt-4 flex items-center justify-between">
        <AutoStatusBadge status={release.status.replace('_', ' ')} />
        {release.target_date && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Target: {new Date(release.target_date).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {release.tasks && release.tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {release.tasks.length} task{release.tasks.length > 1 ? 's' : ''} linked
          </p>
        </div>
      )}
    </div>
  );
}
