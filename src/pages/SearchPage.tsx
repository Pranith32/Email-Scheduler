import { useState, useCallback } from 'react';
import { Search as SearchIcon, Mail, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/LoadingStates';
import { searchEmails } from '@/services/api';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import type { EmailJob } from '@/types';

export function SearchPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [results, setResults] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      showToast('Enter a search term', 'error');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchEmails(query, {
        status: status === 'all' ? undefined : status,
      });
      setResults(data);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [query, status, showToast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Emails</h1>
        <p className="text-gray-500 text-sm mt-1">
          Search across all email content — recipients, subjects, and bodies
        </p>
      </div>

      {/* Search bar */}
      <div className="card p-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by recipient, subject, or body content..."
              className="input-field !pl-10"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary">
            <SearchIcon className="w-4 h-4" />
            Search
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Filter:</span>
          {['all', 'scheduled', 'sent', 'failed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                status === s
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : !searched ? (
          <EmptyState
            icon={<SearchIcon className="w-7 h-7" />}
            title="Search your emails"
            description="Enter a keyword above to search across all your email content"
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-7 h-7" />}
            title="No results found"
            description={`No emails matching "${query}"${status !== 'all' ? ` with status "${status}"` : ''}`}
          />
        ) : (
          <>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-600">
                <strong>{results.length}</strong> result
                {results.length !== 1 ? 's' : ''} for "{query}"
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Subject
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Preview
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3.5">
                        <p className="text-sm font-medium text-gray-900">
                          {job.recipient}
                        </p>
                        {job.recipient_name && (
                          <p className="text-xs text-gray-500">
                            {job.recipient_name}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3.5 hidden md:table-cell">
                        <p className="text-sm text-gray-700 truncate max-w-[200px]">
                          {job.subject}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 hidden sm:table-cell">
                        <p className="text-sm text-gray-600">
                          {job.sent_at
                            ? formatDateTime(job.sent_at)
                            : formatDateTime(job.scheduled_at)}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {job.preview_url && (
                          <a
                            href={job.preview_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
