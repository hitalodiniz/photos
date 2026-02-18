export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startInternalCron } = await import('./lib/cron-scheduler');
    startInternalCron();
  }
}
