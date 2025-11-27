import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Release, ReleaseStatus } from '@/types';
import { Plus, Rocket, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

export function ReleasesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);

  const { data: releases, isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list(),
  });

  const createMutation = useMutation({
    mutationFn: api.releases.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Release> }) =>
      api.releases.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      setSelectedRelease(null);
    },
  });

  const getStatusIcon = (status: ReleaseStatus) => {
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
  };

  const getStatusColor = (status: ReleaseStatus) => {
    switch (status) {
      case 'released':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Releases</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Version management and deployment tracking
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Release
        </button>
      </div>

      {/* Releases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {releases?.items?.map((release) => (
          <div
            key={release.id}
            onClick={() => setSelectedRelease(release)}
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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(release.status)}`}>
                {release.status.replace('_', ' ')}
              </span>
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
        ))}
        
        {releases?.items?.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Rocket className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No releases</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new release.
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <ReleaseModal
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {selectedRelease && (
        <ReleaseModal
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
          onSubmit={(data) => updateMutation.mutate({ id: selectedRelease.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ReleaseModal({
  release,
  onClose,
  onSubmit,
  isLoading,
}: {
  release?: Release;
  onClose: () => void;
  onSubmit: (data: { 
    version: string; 
    title: string; 
    description?: string; 
    target_date?: string;
    release_date?: string;
    status?: ReleaseStatus;
  }) => void;
  isLoading: boolean;
}) {
  const [version, setVersion] = useState(release?.version || '');
  const [title, setTitle] = useState(release?.title || '');
  const [description, setDescription] = useState(release?.description || '');
  const [targetDate, setTargetDate] = useState(release?.target_date || '');
  const [releaseDate, setReleaseDate] = useState(release?.release_date || '');
  const [status, setStatus] = useState<ReleaseStatus>(release?.status || 'planned');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      version,
      title,
      description: description || undefined,
      target_date: targetDate || undefined,
      release_date: releaseDate || undefined,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {release ? 'Edit Release' : 'Create Release'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="v1.0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReleaseStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="released">Released</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
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
                placeholder="Q4 Feature Release"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Release Date
                </label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
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
                disabled={isLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : release ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
