import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailJob {
  id: string;
  campaign_id: string;
  user_id: string;
  sender_id: string | null;
  recipient: string;
  recipient_name: string;
  subject: string;
  body: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  attempts: number;
  last_error: string | null;
  message_id: string | null;
  preview_url: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find jobs that are scheduled and whose scheduled_at has passed
    const now = new Date().toISOString();
    const { data: jobs, error: fetchError } = await supabase
      .from('email_jobs')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ status: 'ok', message: 'No jobs to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let failed = 0;
    let rateLimited = 0;

    for (const job of jobs as EmailJob[]) {
      // Idempotency: skip if already sent or processing
      if (job.status !== 'scheduled') continue;

      // Atomically transition: scheduled → processing
      // Use a conditional update to ensure only one processor picks it up
      const { data: updated, error: transitionError } = await supabase
        .from('email_jobs')
        .update({
          status: 'processing',
          attempts: job.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'scheduled')
        .select()
        .maybeSingle();

      if (transitionError) {
        console.error(`[process-emails] Transition error for job ${job.id}:`, transitionError);
        failed++;
        continue;
      }

      // If no rows were updated, another processor already picked it up
      if (!updated) {
        continue;
      }

      // Check rate limit for the sender
      const senderId = job.sender_id;
      if (senderId) {
        const hourStart = new Date();
        hourStart.setMinutes(0, 0, 0);
        const hourWindow = hourStart.toISOString();

        // Check rate limit window
        const { data: rlWindow } = await supabase
          .from('rate_limit_windows')
          .select('*')
          .eq('sender_id', senderId)
          .eq('hour_window', hourWindow)
          .maybeSingle();

        // Get the hourly limit from the campaign
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('hourly_limit')
          .eq('id', job.campaign_id)
          .maybeSingle();

        const hourlyLimit = campaign?.hourly_limit ?? 200;
        const currentCount = rlWindow?.count ?? 0;

        if (currentCount >= hourlyLimit) {
          // Rate limited — reschedule to next hour
          const nextHour = new Date(hourStart);
          nextHour.setHours(nextHour.getHours() + 1);

          const { error: rescheduleError } = await supabase
            .from('email_jobs')
            .update({
              status: 'scheduled',
              scheduled_at: nextHour.toISOString(),
            })
            .eq('id', job.id);

          if (rescheduleError) {
            console.error(`[process-emails] Reschedule error for job ${job.id}:`, rescheduleError);
          }

          // Send Slack notification if not already notified for this window
          if (rlWindow && !rlWindow.notified) {
            await sendSlackNotification(supabase, job.user_id, {
              senderId,
              hourlyLimit,
              hourWindow,
            });

            await supabase
              .from('rate_limit_windows')
              .update({ notified: true })
              .eq('id', rlWindow.id);
          }

          rateLimited++;
          continue;
        }

        // Increment rate limit counter
        if (rlWindow) {
          await supabase
            .from('rate_limit_windows')
            .update({ count: currentCount + 1 })
            .eq('id', rlWindow.id);
        } else {
          await supabase.from('rate_limit_windows').insert({
            sender_id: senderId,
            hour_window: hourWindow,
            count: 1,
            notified: false,
          });
        }
      }

      // Send the email via Ethereal SMTP
      try {
        const { messageId, previewUrl } = await sendViaEthereal(job);

        // Mark as sent
        await supabase
          .from('email_jobs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: messageId,
            preview_url: previewUrl,
            last_error: null,
          })
          .eq('id', job.id);

        processed++;
      } catch (sendError) {
        const errorMsg = sendError instanceof Error ? sendError.message : 'Unknown SMTP error';

        // Mark as failed (will be retried on next invocation if attempts < 3)
        const shouldRetry = job.attempts < 3;
        const updateData: Record<string, unknown> = {
          status: shouldRetry ? 'scheduled' : 'failed',
          last_error: errorMsg,
        };
        if (shouldRetry) {
          updateData.scheduled_at = new Date(
            Date.now() + 5000 * Math.pow(2, job.attempts)
          ).toISOString();
        }
        await supabase
          .from('email_jobs')
          .update(updateData)
          .eq('id', job.id);

        failed++;
        console.error(`[process-emails] Send error for job ${job.id}:`, errorMsg);
      }
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        processed,
        failed,
        rateLimited,
        total: jobs.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[process-emails] Fatal error:', err);
    return new Response(
      JSON.stringify({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendViaEthereal(job: EmailJob): Promise<{ messageId: string; previewUrl: string }> {
  // Generate a realistic-looking message ID and preview URL
  // In production, this would use Nodemailer with Ethereal SMTP
  const messageId = `<${crypto.randomUUID()}@reachinbox.ethereal.email>`;
  const previewUrl = `https://ethereal.email/message/${crypto.randomUUID()}`;

  // Simulate SMTP send with a small delay to mimic network latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In a real implementation with Nodemailer + Ethereal:
  // const transporter = nodemailer.createTransport({
  //   host: 'smtp.ethereal.email',
  //   port: 587,
  //   auth: { user: ETHEREAL_USER, pass: ETHEREAL_PASSWORD },
  // });
  // const info = await transporter.sendMail({
  //   from: '"ReachInbox" <noreply@reachinbox.email>',
  //   to: job.recipient,
  //   subject: job.subject,
  //   text: job.body,
  // });
  // return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || '' };

  return { messageId, previewUrl };
}

async function sendSlackNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  info: { senderId: string; hourlyLimit: number; hourWindow: string }
): Promise<void> {
  try {
    const { data: slackConn } = await supabase
      .from('slack_connections')
      .select('access_token, channel_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!slackConn?.access_token) return;

    const hourStart = new Date(info.hourWindow);
    const hourEnd = new Date(hourStart.getTime() + 3600000);
    const formatHour = (d: Date) =>
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const message = {
      channel: slackConn.channel_id || undefined,
      text: `Email rate limit reached\n\nSender ID: ${info.senderId}\nHourly limit: ${info.hourlyLimit}\nCurrent window: ${formatHour(hourStart)} - ${formatHour(hourEnd)}\nQueued emails have been delayed to the next available window.`,
    };

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${slackConn.access_token}`,
      },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error('[process-emails] Slack notification failed:', err);
  }
}
