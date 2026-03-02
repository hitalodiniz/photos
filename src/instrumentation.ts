export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suprime apenas DEP0169 (url.parse) vindo de dependências até elas migrarem para WHATWG URL
    const originalEmit = process.emitWarning;
    process.emitWarning = function (
      warning: string | Error,
      typeOrOpts?: string | { type?: string; code?: string },
      code?: string,
    ) {
      const codeStr =
        typeof typeOrOpts === 'object' && typeOrOpts?.code
          ? typeOrOpts.code
          : code;
      if (codeStr === 'DEP0169') return;
      if (typeof typeOrOpts === 'object')
        return originalEmit.call(process, warning, typeOrOpts);
      return originalEmit.call(process, warning, typeOrOpts, code);
    };

    const { startInternalCron } = await import('./lib/cron-scheduler');
    startInternalCron();
  }
}
