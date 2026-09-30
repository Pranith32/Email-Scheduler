import { supabase } from '@/lib/supabase';
import type {
  Sender,
  Campaign,
  EmailJob,
  ScheduleEmailPayload,
  SlackConnection,
} from '@/types';

// ===== SENDERS =====

export async function fetchSenders(): Promise<Sender[]> {
  const { data, error } = await supabase
    .from('senders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Sender[];
}

export async function createSender(input: {
  email: string;
  display_name: string;
}): Promise<Sender> {
  const { data, error } = await supabase
    .from('senders')
    .insert({
      email: input.email,
      display_name: input.display_name,
      ethereal_user: null,
      ethereal_password: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Sender;
}

export async function updateSender(
  id: string,
  input: Partial<Pick<Sender, 'email' | 'display_name' | 'is_active'>>
): Promise<Sender> {
  const { data, error } = await supabase
    .from('senders')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Sender;
}

export async function deleteSender(id: string): Promise<void> {
  const { error } = await supabase.from('senders').delete().eq('id', id);
  if (error) throw error;
}

// ===== CAMPAIGNS =====

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, sender:senders(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Campaign[];
}

export async function fetchCampaign(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, sender:senders(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Campaign | null;
}

// ===== EMAIL JOBS =====

export async function fetchEmailJobs(
  status: 'scheduled' | 'sent',
  page = 1,
  perPage = 20,
  search = ''
): Promise<{ jobs: EmailJob[]; total: number }> {
  const statuses =
    status === 'scheduled'
      ? ['scheduled', 'processing']
      : ['sent', 'failed'];

  let query = supabase
    .from('email_jobs')
    .select('*, sender:senders(*), campaign:campaigns(*)', { count: 'exact' })
    .in('status', statuses)
    .order('scheduled_at', { ascending: status === 'scheduled' })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search.trim()) {
    query = query.or(
      `recipient.ilike.%${search}%,subject.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { jobs: (data as EmailJob[]) || [], total: count || 0 };
}

export async function fetchEmailJob(id: string): Promise<EmailJob | null> {
  const { data, error } = await supabase
    .from('email_jobs')
    .select('*, sender:senders(*), campaign:campaigns(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as EmailJob | null;
}

export async function cancelEmailJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_jobs')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .in('status', ['scheduled', 'processing']);
  if (error) throw error;
}

export async function fetchJobStats(): Promise<{
  scheduled: number;
  sent: number;
  failed: number;
  processing: number;
}> {
  const { count: scheduled } = await supabase
    .from('email_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scheduled');

  const { count: sent } = await supabase
    .from('email_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent');

  const { count: failed } = await supabase
    .from('email_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed');

  const { count: processing } = await supabase
    .from('email_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing');

  return {
    scheduled: scheduled || 0,
    sent: sent || 0,
    failed: failed || 0,
    processing: processing || 0,
  };
}

// ===== SCHEDULE EMAILS =====

export async function scheduleEmails(
  payload: ScheduleEmailPayload
): Promise<{ campaignId: string; jobCount: number }> {
  const startTime = new Date(payload.startTime);
  const now = new Date();

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      subject: payload.subject,
      body: payload.body,
      start_time: startTime.toISOString(),
      delay_ms: payload.delayMs,
      hourly_limit: payload.hourlyLimit,
      sender_id: payload.senderId,
    })
    .select()
    .single();

  if (campaignError) throw campaignError;

  const validRecipients = payload.recipients.filter((r) => r.email);

  const jobs = validRecipients.map((recipient, index) => {
    const scheduledAt = new Date(
      Math.max(
        startTime.getTime() + index * payload.delayMs,
        now.getTime()
      )
    );

    return {
      campaign_id: campaign.id,
      sender_id: payload.senderId,
      recipient: recipient.email,
      recipient_name: recipient.name || '',
      subject: payload.subject,
      body: payload.body,
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled' as const,
    };
  });

  const { error: jobsError } = await supabase.from('email_jobs').insert(jobs);
  if (jobsError) throw jobsError;

  return { campaignId: campaign.id, jobCount: jobs.length };
}

// ===== SEARCH =====

export async function searchEmails(
  query: string,
  filters?: { status?: string; senderId?: string }
): Promise<EmailJob[]> {
  let q = supabase
    .from('email_jobs')
    .select('*, sender:senders(*), campaign:campaigns(*)')
    .or(
      `recipient.ilike.%${query}%,subject.ilike.%${query}%,body.ilike.%${query}%`
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (filters?.status && filters.status !== 'all') {
    q = q.eq('status', filters.status);
  }
  if (filters?.senderId) {
    q = q.eq('sender_id', filters.senderId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as EmailJob[]) || [];
}

// ===== SLACK =====

export async function fetchSlackConnection(): Promise<SlackConnection | null> {
  const { data, error } = await supabase
    .from('slack_connections')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as SlackConnection | null;
}

export async function disconnectSlack(): Promise<void> {
  const { error } = await supabase.from('slack_connections').delete().neq(
    'id',
    '00000000-0000-0000-0000-000000000000'
  );
  if (error) throw error;
}
