import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  ExternalLink,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import {
  TableSkeleton,
  EmptyState,
} from '@/components/LoadingStates';
import { Modal } from '@/components/Modal';
import { fetchEmailJobs, cancelEmailJob, fetchEmailJob } from '@/services/api';
import { formatDateTime, formatRelative } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import type { EmailJob } from '@/types';

interface EmailTablePageProps {
  type: 'scheduled' | 'sent';
  refreshKey: number;
}

export function EmailTablePage({ type, refreshKey }: EmailTablePageProps) {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [perPage] = useState(20);
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { jobs, total } = await fetchEmailJobs(
        type,
        page,
        perPage,
        search
      );
      setJobs(jobs);
      setTotal(total);
    } catch {
      showToast('Failed to load emails', 'error');
    } finally {
      setLoading(false);
    }
  }, [type, page, perPage, search, showToast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Auto-refresh for scheduled view
  useEffect(() => {
    if (type !== 'scheduled') return;
    const interval = setInterval(() => {
      load();
    }, 8000);
    return () => clearInterval(interval);
  }, [type, load]);

  function handleSearch() {
    setPage(1);
    setSearch(searchInput);
  }

  function handleClearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  async function handleCancel(jobId: string) {
    try {
      await cancelEmailJob(jobId);
      showToast('Email cancelled', 'success');
      load();
    } catch {
      showToast('Failed to cancel email', 'error');
    }
  }

  async function openDetail(jobId: string) {
    setDetailLoading(true);
    setSelectedJob(null);
    try {
      const job = await fetchEmailJob(jobId);
      setSelectedJob(job);
    } catch {
      showToast('Failed to load email details', 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  const totalPages = Math.ceil(total / perPage);
  const title = type === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails';
  const description =
    type === 'scheduled'
      ? 'Emails queued for delivery'
      : 'Emails that have been processed';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 text-sm mt-1">{description}</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by recipient or subject..."
            className="input-field !pl-10"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={handleSearch} className="btn-secondary">
          <Search className="w-4 h-4" />
          Search
        </button>
        <button onClick={load} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-7 h-7" />}
            title={search ? 'No results found' : `No ${type} emails yet`}
            description={
              search
                ? 'Try a different search term'
                : type === 'scheduled'
                ? 'Schedule emails to see them here'
                : 'Sent emails will appear here after delivery'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Subject
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Sender
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {type === 'scheduled' ? 'Scheduled' : 'Sent'}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => openDetail(job.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {job.recipient[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {job.recipient}
                            </p>
                            {job.recipient_name && (
                              <p className="text-xs text-gray-500 truncate">
                                {job.recipient_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-gray-700 truncate max-w-[200px]">
                          {job.subject}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 hidden lg:table-cell">
                        <p className="text-sm text-gray-600 truncate max-w-[150px]">
                          {job.sender?.display_name || job.sender?.email || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-sm text-gray-700">
                          {type === 'scheduled'
                            ? formatDateTime(job.scheduled_at)
                            : job.sent_at
                            ? formatDateTime(job.sent_at)
                            : '—'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {type === 'scheduled'
                            ? formatRelative(job.scheduled_at)
                            : job.sent_at
                            ? formatRelative(job.sent_at)
                            : ''}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {type === 'scheduled' &&
                          (job.status === 'scheduled' ||
                            job.status === 'processing') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(job.id);
                              }}
                              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-md font-medium transition-all"
                            >
                              Cancel
                            </button>
                          )}
                        {type === 'sent' && job.preview_url && (
                          <a
                            href={job.preview_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-md font-medium transition-all inline-flex items-center gap-1"
                          >
                            Preview
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {total} email{total !== 1 ? 's' : ''} · Page {page} of{' '}
                  {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary !px-3 !py-2 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="btn-secondary !px-3 !py-2 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedJob || detailLoading}
        onClose={() => setSelectedJob(null)}
        title="Email Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 w-8 h-8" />
          </div>
        ) : selectedJob ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center text-lg font-semibold">
                {selectedJob.recipient[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedJob.recipient}
                </p>
                {selectedJob.recipient_name && (
                  <p className="text-sm text-gray-500">
                    {selectedJob.recipient_name}
                  </p>
                )}
              </div>
              <div className="ml-auto">
                <StatusBadge status={selectedJob.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField
                icon={<Mail className="w-4 h-4" />}
                label="Subject"
                value={selectedJob.subject}
              />
              <DetailField
                icon={<Clock className="w-4 h-4" />}
                label="Scheduled at"
                value={formatDateTime(selectedJob.scheduled_at)}
              />
              <DetailField
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="Sent at"
                value={
                  selectedJob.sent_at
                    ? formatDateTime(selectedJob.sent_at)
                    : 'Not sent yet'
                }
              />
              <DetailField
                icon={<AlertCircle className="w-4 h-4" />}
                label="Sender"
                value={
                  selectedJob.sender?.display_name ||
                  selectedJob.sender?.email ||
                  '—'
                }
              />
            </div>

            <div>
              <p className="label-text">Body</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-48 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedJob.body}
                </p>
              </div>
            </div>

            {selectedJob.last_error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-700 mb-1">
                  Error details
                </p>
                <p className="text-sm text-red-600">{selectedJob.last_error}</p>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-500">Attempts:</span>{' '}
                <span className="font-medium text-gray-900">
                  {selectedJob.attempts}
                </span>
              </div>
              {selectedJob.message_id && (
                <div className="min-w-0">
                  <span className="text-gray-500">Message ID:</span>{' '}
                  <span className="font-mono text-xs text-gray-700 truncate">
                    {selectedJob.message_id}
                  </span>
                </div>
              )}
            </div>

            {selectedJob.preview_url && (
              <a
                href={selectedJob.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                <ExternalLink className="w-4 h-4" />
                View Email Preview
              </a>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mb-1">
        {icon}
        {label}
      </p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}
