import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-emails`;

export function useEmailProcessor(enabled: boolean) {
  const [processing, setProcessing] = useState(false);

  const processEmails = async () => {
    setProcessing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Processing failed (${response.status})`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('[email-processor] Error:', err);
      return null;
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Process immediately on mount
    processEmails();

    // Then poll every 10 seconds to process due jobs
    const interval = setInterval(() => {
      processEmails();
    }, 10000);

    return () => clearInterval(interval);
  }, [enabled]);

  return { processing, processEmails };
}
