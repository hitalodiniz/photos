// @/lib/cron-scheduler.ts
import { processHourlyStatsAggregation } from '@/core/services/galeria-stats.service';

/**
 * ⏲️ SCHEDULER SIMPLES
 * Roda dentro da instância do seu app Node.js
 */
export async function startInternalCron() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_RUNTIME === 'nodejs'
  ) {
    // Evita rodar múltiplos crons se você tiver várias instâncias (em prod)
  }

  //console.log('🚀 Cron Interno iniciado: Monitorando estatísticas...');

  // Roda a cada 1 hora (3600000 ms)
  // setInterval(
  //   async () => {
  //     try {
  //       console.log('🔄 Executando agregação de notificações...');
  //       await processHourlyStatsAggregation();
  //     } catch (error) {
  //       console.error('❌ Erro no Cron Interno:', error);
  //     }
  //   },
  //   1 * 60 * 60 * 1000,
  // );
}
