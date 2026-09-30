import { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Mail,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ComposeModal } from '@/components/ComposeModal';
import { SlackIntegration } from '@/components/SlackIntegration';
import { useToast } from '@/context/ToastContext';
import { fetchJobStats, fetchSenders, fetchCampaigns } from '@/services/api';
import { formatDateTime, formatRelative } from '@/lib/utils';
import type { Sender, Campaign } from '@/types';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onCompose: () => void;
  composeOpen: boolean;
  onCloseCompose: () => void;
  refreshKey: number;
  onRefresh: () => void;
}

export function DashboardPage({
  onNavigate,
  onCompose,
  composeOpen,
  onCloseCompose,
  refreshKey,
  onRefresh,
}: DashboardPageProps) {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    scheduled: 0,
    sent: 0,
    failed: 0,
    processing: 0,
  });
  const [senders, setSenders] = useState<Sender[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, senderList, campaignList] = await Promise.all([
          fetchJobStats(),
          fetchSenders(),
          fetchCampaigns(),
        ]);
        setStats(s);
        setSenders(senderList);
        setCampaigns(campaignList);
      } catch {
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshKey, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Overview of your email campaigns and delivery status
          </p>
        </div>
        <button onClick={onCompose} className="btn-primary">
          <Plus className="w-4 h-4" />
          Compose New Email
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          icon={Clock}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          label="Processing"
          value={stats.processing}
          icon={Loader2}
          color="amber"
          isLoading={loading}
        />
        <StatCard
          label="Sent"
          value={stats.sent}
          icon={CheckCircle2}
          color="emerald"
          isLoading={loading}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={AlertCircle}
          color="red"
          isLoading={loading}
        />
      </div>

      {/* Recent campaigns */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Campaigns</h2>
          <span className="text-sm text-gray-500">{campaigns.length} total</span>
        </div>
        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <p className="text-gray-900 font-medium">No campaigns yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Create your first email campaign to get started
            </p>
            <button onClick={onCompose} className="btn-primary">
              <Plus className="w-4 h-4" />
              Compose New Email
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {campaigns.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {c.subject}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {c.sender?.display_name || c.sender?.email || 'No sender'} ·{' '}
                    Starting {formatRelative(c.start_time)}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400">Start time</p>
                  <p className="text-sm text-gray-700">
                    {formatDateTime(c.start_time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slack integration */}
      <SlackIntegration />

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: 'Scheduled Emails',
            desc: 'View all upcoming emails',
            icon: Clock,
            page: 'scheduled',
          },
          {
            label: 'Sent Emails',
            desc: 'Track delivery status',
            icon: CheckCircle2,
            page: 'sent',
          },
          {
            label: 'Search Emails',
            desc: 'Find emails by content',
            icon: Mail,
            page: 'search',
          },
        ].map((link) => (
          <button
            key={link.page}
            onClick={() => onNavigate(link.page)}
            className="card p-5 text-left hover:shadow-md transition-shadow group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <link.icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900">{link.label}</p>
            <p className="text-sm text-gray-500 mt-0.5">{link.desc}</p>
          </button>
        ))}
      </div>

      <ComposeModal
        isOpen={composeOpen}
        onClose={onCloseCompose}
        senders={senders}
        onScheduled={() => {
          onCloseCompose();
          showToast('Emails scheduled successfully!', 'success');
          onRefresh();
        }}
      />
    </div>
  );
}
