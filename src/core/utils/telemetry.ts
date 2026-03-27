import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function logSystemEvent(data: {
  serviceName: string;
  status: 'success' | 'error' | 'partial';
  executionTimeMs?: number;
  payload?: unknown;
  errorMessage?: string;
}) {
  try {
    await supabaseAdmin.from('tb_system_logs').insert([
      {
        service_name: data.serviceName,
        status: data.status,
        execution_time_ms: data.executionTimeMs,
        payload: data.payload,
        error_message: data.errorMessage,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (e) {
    console.error('Falha crítica ao gravar log no banco:', e);
  }
}
