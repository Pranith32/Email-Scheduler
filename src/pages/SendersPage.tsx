import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Mail,
  Edit2,
  Check,
  X,
  Users as UsersIcon,
} from 'lucide-react';
import {
  fetchSenders,
  createSender,
  deleteSender,
  updateSender,
} from '@/services/api';
import { Modal } from '@/components/Modal';
import {
  EmptyState,
  TableSkeleton,
} from '@/components/LoadingStates';
import { useToast } from '@/context/ToastContext';
import type { Sender } from '@/types';
import { cn } from '@/lib/utils';

export function SendersPage() {
  const { showToast } = useToast();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Sender | null>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSenders();
      setSenders(data);
    } catch {
      showToast('Failed to load senders', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!email.trim()) {
      showToast('Email is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateSender(editing.id, {
          email: email.trim(),
          display_name: displayName.trim(),
        });
        showToast('Sender updated', 'success');
      } else {
        await createSender({
          email: email.trim(),
          display_name: displayName.trim(),
        });
        showToast('Sender created', 'success');
      }
      setShowAdd(false);
      setEditing(null);
      setEmail('');
      setDisplayName('');
      load();
    } catch {
      showToast('Failed to save sender', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSender(id);
      showToast('Sender deleted', 'success');
      load();
    } catch {
      showToast('Failed to delete sender', 'error');
    }
  }

  function openEdit(sender: Sender) {
    setEditing(sender);
    setEmail(sender.email);
    setDisplayName(sender.display_name);
    setShowAdd(true);
  }

  function openAdd() {
    setEditing(null);
    setEmail('');
    setDisplayName('');
    setShowAdd(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Senders</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your email sender accounts
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Sender
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={3} />
        ) : senders.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="w-7 h-7" />}
            title="No senders yet"
            description="Add a sender account to start scheduling emails"
            action={
              <button onClick={openAdd} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add Sender
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Email
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
                {senders.map((sender) => (
                  <tr key={sender.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {sender.display_name || sender.email}
                          </p>
                          <p className="text-xs text-gray-500 sm:hidden">
                            {sender.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 hidden sm:table-cell">
                      <p className="text-sm text-gray-700">{sender.email}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                          sender.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            sender.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                          )}
                        />
                        {sender.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(sender)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sender.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editing ? 'Edit Sender' : 'Add Sender'}
        description="Configure an email sender account"
      >
        <div className="space-y-4">
          <div>
            <label className="label-text">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              placeholder="John from ReachInbox"
            />
          </div>
          <div>
            <label className="label-text">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="sender@example.com"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? (
                <div className="animate-spin rounded-full border-2 border-white/30 border-t-white w-5 h-5" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editing ? 'Save changes' : 'Add sender'}
                </>
              )}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="btn-secondary"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
