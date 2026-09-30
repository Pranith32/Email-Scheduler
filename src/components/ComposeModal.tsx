import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/context/ToastContext';
import { parseCsv, personalizeBody, cn } from '@/lib/utils';
import { scheduleEmails } from '@/services/api';
import type { Sender, ParsedRecipient } from '@/types';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  onScheduled: () => void;
}

export function ComposeModal({
  isOpen,
  onClose,
  senders,
  onScheduled,
}: ComposeModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<ParsedRecipient[]>([]);
  const [startTime, setStartTime] = useState('');
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [senderId, setSenderId] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [csvName, setCsvName] = useState('');
  const [manualInput, setManualInput] = useState(false);
  const [manualText, setManualText] = useState('');

  const validRecipients = recipients.filter((r) => r.valid);
  const invalidRecipients = recipients.filter((r) => !r.valid);

  const resetForm = useCallback(() => {
    setSubject('');
    setBody('');
    setRecipients([]);
    setStartTime('');
    setDelayMs(2000);
    setHourlyLimit(200);
    setSenderId('');
    setCsvName('');
    setManualInput(false);
    setManualText('');
  }, []);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setRecipients(parsed);
      const valid = parsed.filter((r) => r.valid).length;
      const invalid = parsed.filter((r) => !r.valid).length;
      showToast(
        `${valid} valid email${valid !== 1 ? 's' : ''} detected${
          invalid > 0 ? `, ${invalid} invalid` : ''
        }`,
        invalid > 0 ? 'warning' : 'success'
      );
    };
    reader.readAsText(file);
  }

  function handleManualParse() {
    if (!manualText.trim()) return;
    const parsed = parseCsv(manualText);
    setRecipients(parsed);
    setManualInput(false);
    const valid = parsed.filter((r) => r.valid).length;
    showToast(`${valid} valid emails detected`, 'success');
  }

  function handleRemoveRecipient(email: string) {
    setRecipients((prev) => prev.filter((r) => r.email !== email));
  }

  async function handleSchedule() {
    if (!subject.trim()) {
      showToast('Subject is required', 'error');
      return;
    }
    if (!body.trim()) {
      showToast('Email body is required', 'error');
      return;
    }
    if (validRecipients.length === 0) {
      showToast('Add at least one valid recipient', 'error');
      return;
    }
    if (!startTime) {
      showToast('Select a start time', 'error');
      return;
    }
    if (!senderId) {
      showToast('Select a sender', 'error');
      return;
    }
    if (senders.length === 0) {
      showToast('Create a sender first', 'error');
      return;
    }

    setScheduling(true);
    try {
      const result = await scheduleEmails({
        subject,
        body,
        recipients: validRecipients.map((r) => ({
          email: r.email,
          name: r.name,
        })),
        startTime: new Date(startTime).toISOString(),
        delayMs,
        hourlyLimit,
        senderId,
      });

      showToast(
        `${result.jobCount} email${result.jobCount !== 1 ? 's' : ''} scheduled successfully!`,
        'success'
      );
      resetForm();
      onClose();
      onScheduled();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to schedule emails',
        'error'
      );
    } finally {
      setScheduling(false);
    }
  }

  const previewRecipient = validRecipients[0];
  const previewBody = previewRecipient
    ? personalizeBody(body, {
        email: previewRecipient.email,
        name: previewRecipient.name,
      })
    : body;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose New Email"
      description="Schedule personalized emails to multiple recipients"
      size="xl"
    >
      <div className="space-y-5">
        {/* Sender selection */}
        <div>
          <label className="label-text">Sender</label>
          {senders.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              No senders yet. Create one in the Senders tab first.
            </div>
          ) : (
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="input-field"
            >
              <option value="">Select a sender...</option>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name || s.email} — {s.email}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="label-text">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-field"
            placeholder="Email subject line"
          />
        </div>

        {/* Body */}
        <div>
          <label className="label-text">
            Body{' '}
            <span className="text-gray-400 font-normal">
              (use {'{{name}}'} for personalization)
            </span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input-field min-h-[120px] resize-y"
            placeholder="Hello {{name}},&#10;&#10;This is a personalized email..."
          />
          {previewRecipient && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1 font-medium">
                Preview for {previewRecipient.email}:
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                {previewBody}
              </p>
            </div>
          )}
        </div>

        {/* Recipients */}
        <div>
          <label className="label-text">Recipients</label>
          {recipients.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {manualInput ? (
                <div className="space-y-3">
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="input-field min-h-[100px] text-left"
                    placeholder="email,name&#10;john@example.com,John&#10;alice@example.com,Alice"
                  />
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleManualParse}
                      className="btn-primary"
                    >
                      Parse emails
                    </button>
                    <button
                      onClick={() => setManualInput(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">
                    Upload a CSV file or paste emails manually
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary"
                    >
                      <Upload className="w-4 h-4" />
                      Upload CSV
                    </button>
                    <button
                      onClick={() => setManualInput(true)}
                      className="btn-secondary"
                    >
                      Paste manually
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">
                      {validRecipients.length} valid
                    </span>
                  </div>
                  {invalidRecipients.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">
                        {invalidRecipients.length} invalid
                      </span>
                    </div>
                  )}
                  {csvName && (
                    <span className="text-sm text-gray-500 truncate max-w-[150px]">
                      {csvName}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setRecipients([]);
                    setCsvName('');
                  }}
                  className="text-sm text-gray-500 hover:text-red-600 font-medium"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {recipients.slice(0, 100).map((r) => (
                  <div
                    key={r.email}
                    className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0"
                  >
                    {r.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {r.email}
                    </span>
                    {r.name && (
                      <span className="text-xs text-gray-500">{r.name}</span>
                    )}
                    <button
                      onClick={() => handleRemoveRecipient(r.email)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {recipients.length > 100 && (
                  <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                    +{recipients.length - 100} more recipients
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scheduling config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label-text">Start time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Delay (seconds)</label>
            <input
              type="number"
              value={delayMs / 1000}
              onChange={(e) =>
                setDelayMs(Math.max(0, Number(e.target.value) * 1000))
              }
              className="input-field"
              min="0"
              step="0.5"
            />
          </div>
          <div>
            <label className="label-text">Hourly limit</label>
            <input
              type="number"
              value={hourlyLimit}
              onChange={(e) =>
                setHourlyLimit(Math.max(1, Number(e.target.value)))
              }
              className="input-field"
              min="1"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 text-sm text-blue-900">
            <Users className="w-4 h-4" />
            <span>
              <strong>{validRecipients.length}</strong> email
              {validRecipients.length !== 1 ? 's' : ''} will be scheduled
              {delayMs > 0 && (
                <>
                  {' '}with <strong>{delayMs / 1000}s</strong> between each
                </>
              )}
              {hourlyLimit > 0 && (
                <>
                  {' '}· max <strong>{hourlyLimit}/hour</strong>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSchedule}
            disabled={scheduling}
            className="btn-primary flex-1 !py-3"
          >
            {scheduling ? (
              <>
                <div className="animate-spin rounded-full border-2 border-white/30 border-t-white w-5 h-5" />
                Scheduling...
              </>
            ) : (
              <>Schedule Emails</>
            )}
          </button>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="btn-secondary !py-3"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
