import type { ParsedRecipient } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function parseCsv(text: string): ParsedRecipient[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('email');
  const headerCols = hasHeader
    ? firstLine.split(',').map((c) => c.trim())
    : [];
  const emailColIndex = headerCols.findIndex((c) => c === 'email');
  const nameColIndex = headerCols.findIndex(
    (c) => c === 'name' || c === 'full_name'
  );

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const seen = new Set<string>();
  const results: ParsedRecipient[] = [];

  for (const line of dataLines) {
    const cols = line.split(',').map((c) => c.trim());
    const email = hasHeader
      ? (emailColIndex >= 0 ? cols[emailColIndex] : cols[0] || '')
      : cols[0] || '';
    const name = hasHeader
      ? (nameColIndex >= 0 ? cols[nameColIndex] : '')
      : (cols[1] || '');

    const trimmedEmail = email.trim().toLowerCase();

    if (seen.has(trimmedEmail)) continue;
    seen.add(trimmedEmail);

    const valid = validateEmail(trimmedEmail);
    results.push({
      email: trimmedEmail,
      name: name.trim(),
      valid,
      error: valid ? undefined : 'Invalid email format',
    });
  }

  return results;
}

export function personalizeBody(
  body: string,
  recipient: { email: string; name?: string }
): string {
  const name = recipient.name?.trim() || '';
  return body
    .replace(/\{\{name\}\}/gi, name)
    .replace(/\{\{email\}\}/gi, recipient.email)
    .replace(/\{\{first_name\}\}/gi, name.split(' ')[0] || 'there');
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (absDiff < 60000) return 'just now';
  if (diff > 0) {
    if (days > 0) return `in ${days}d`;
    if (hours > 0) return `in ${hours}h`;
    return `in ${mins}m`;
  } else {
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  }
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
