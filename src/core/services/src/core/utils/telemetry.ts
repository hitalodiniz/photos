import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Vital usar Service Role para logs de sistema
);

export async function logSystemEvent(data: {
  serviceName: string;
  status: 'success' | 'error' | 'partial';
  executionTimeMs?: number;
  payload?: any;
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
    console.error('🔴 Falha crítica ao gravar log no banco:', e);
  }
}
