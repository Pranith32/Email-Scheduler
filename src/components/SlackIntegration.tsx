import { useEffect, useState } from 'react';
import { Slack, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';

interface SlackConnection {
  id: string;
  team_id: string;
  team_name: string;
  channel_id: string | null;
  created_at: string;
}

export function SlackIntegration() {
  const { showToast } = useToast();
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<SlackConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [connecting, setConnecting] = useState(false);

  async function checkStatus() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-connect/status`,
        {
          headers: {
            Authorization: `Bearer ${session?.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setConnected(data.connected);
        setConnection(data.connection);
      }
    } catch {
      // Silent fail — not critical
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function handleConnect() {
    if (!teamName.trim()) {
      showToast('Enter a team name', 'error');
      return;
    }
    setConnecting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-connect/connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            teamName: teamName.trim(),
            teamId: `team-${Date.now()}`,
            accessToken: `xoxb-${crypto.randomUUID()}`,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to connect Slack');

      showToast('Slack connected successfully!', 'success');
      setShowConnect(false);
      setTeamName('');
      checkStatus();
    } catch {
      showToast('Failed to connect Slack', 'error');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      const { data: session } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-connect/disconnect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      showToast('Slack disconnected', 'success');
      checkStatus();
    } catch {
      showToast('Failed to disconnect', 'error');
    }
  }

  if (loading) {
    return (
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            connected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Slack className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">Slack Notifications</p>
          <p className="text-sm text-gray-500">
            {connected
              ? `Connected to ${connection?.team_name}`
              : 'Get notified when rate limits are hit'}
          </p>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
            <button onClick={handleDisconnect} className="btn-ghost text-red-600 hover:bg-red-50">
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={() => setShowConnect(true)} className="btn-secondary">
            <Slack className="w-4 h-4" />
            Connect Slack
          </button>
        )}
      </div>

      <Modal
        isOpen={showConnect}
        onClose={() => setShowConnect(false)}
        title="Connect Slack"
        description="Receive rate limit notifications in Slack"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-700 leading-relaxed">
              In a production deployment, this would redirect you to Slack's OAuth
              authorization page. For this demo, enter your Slack team name to
              simulate the connection. Rate limit notifications will be sent via
              the Slack API when your hourly email limit is reached.
            </p>
          </div>
          <div>
            <label className="label-text">Slack team name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input-field"
              placeholder="My Team Workspace"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary flex-1"
            >
              {connecting ? (
                <div className="animate-spin rounded-full border-2 border-white/30 border-t-white w-5 h-5" />
              ) : (
                'Authorize Connection'
              )}
            </button>
            <button onClick={() => setShowConnect(false)} className="btn-secondary">
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
