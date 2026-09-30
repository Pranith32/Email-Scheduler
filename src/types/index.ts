export type EmailJobStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Sender {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  ethereal_user: string | null;
  ethereal_password: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  sender_id: string | null;
  subject: string;
  body: string;
  start_time: string;
  delay_ms: number;
  hourly_limit: number;
  status: string;
  created_at: string;
  updated_at: string;
  sender?: Sender | null;
}

export interface EmailJob {
  id: string;
  campaign_id: string;
  user_id: string;
  sender_id: string | null;
  recipient: string;
  recipient_name: string;
  subject: string;
  body: string;
  status: EmailJobStatus;
  scheduled_at: string;
  sent_at: string | null;
  attempts: number;
  last_error: string | null;
  message_id: string | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  sender?: Sender | null;
  campaign?: Campaign | null;
}

export interface SlackConnection {
  id: string;
  user_id: string;
  team_id: string;
  team_name: string;
  access_token: string;
  channel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: { email: string; name?: string }[];
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  senderId: string;
}

export interface ParsedRecipient {
  email: string;
  name: string;
  valid: boolean;
  error?: string;
}
