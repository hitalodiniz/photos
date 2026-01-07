// test-email.ts
// Como rodar: Use o comando npx tsx test-email.ts no seu terminal.
import { sendAppErrorLogAction } from '@/actions/email.actions';

async function test() {
  console.log('🚀 Iniciando teste de envio...');
  const result = await sendAppErrorLogAction(
    new Error('Teste de conexão SMTP bem-sucedido!'),
    'Script de Teste Manual',
  );

  if (result.success) {
    console.log('✅ E-mail enviado! Verifique app.suagaleria@gmail.com');
  } else {
    console.log('❌ Falha no envio:', result.error);
  }
}

test();
