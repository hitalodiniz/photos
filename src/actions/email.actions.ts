'use server';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'app.suagaleria@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * BASE DO LAYOUT (WRAPPER)
 * Padronização das pílulas sólidas grafite para todos os e-mails
 */
const emailWrapper = (content: string) => `
  <div style="background-color: #000; padding: 40px; text-align: center; font-family: sans-serif;">
    <div style="max-width: 550px; margin: 0 auto; background-color: #2A2D31; border-radius: 40px; padding: 40px; border: 1px solid rgba(255,255,255,0.05); text-align: left;">
      ${content}
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <p style="font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.15em;">
          Sistema de Monitoramento Automático • Sua Galeria
        </p>
      </div>
    </div>
  </div>
`;

// --- TEMPLATES DE E-MAIL ---

const templates = {
  // 1. SOLICITAÇÃO DE ACESSO
  accessRequest: (
    name: string,
    email: string,
    whatsapp: string,
    galeriaTitle: string,
  ) =>
    emailWrapper(`
    <div style="margin-bottom: 24px;">
      <span style="color: #D4AF37; font-size: 32px; display: block; margin-bottom: 12px;">🗝️</span>
      <h2 style="color: #ffffff; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; font-size: 13px; margin: 0;">Nova Solicitação de Acesso</h2>
    </div>
    <p style="color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
      O cliente <strong>${name}</strong> deseja acessar a galeria <strong>${galeriaTitle}</strong>.
    </p>
    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05);">
      <p style="color: #fff; margin: 8px 0; font-size: 13px;"><strong>E-mail:</strong> ${email}</p>
      <p style="color: #fff; margin: 8px 0; font-size: 13px;"><strong>WhatsApp:</strong> ${whatsapp}</p>
    </div>
  `),

  // 2. RELATÓRIO DE ERRO (NOVO)
  appError: (errorDetails: string, context?: string) =>
    emailWrapper(`
    <div style="margin-bottom: 24px;">
      <span style="color: #D4AF37; font-size: 32px; display: block; margin-bottom: 12px;">⚠️</span>
      <h2 style="color: #ffffff; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; font-size: 13px; margin: 0;">Alerta de Instabilidade Técnica</h2>
      <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 4px; text-transform: uppercase;">Log de erro capturado no servidor</p>
    </div>
    <div style="background: rgba(255,100,100,0.05); padding: 20px; border-radius: 24px; border: 1px solid rgba(255,100,100,0.2); margin-bottom: 20px;">
      <p style="color: #ff6b6b; font-family: monospace; font-size: 12px; margin: 0; white-space: pre-wrap;">
        ${errorDetails}
      </p>
    </div>
    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
      <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 12px;"><strong>Contexto:</strong> ${context || 'Geral'}</p>
      <p style="color: rgba(255,255,255,0.6); margin: 5px 0 0 0; font-size: 12px;"><strong>Timestamp:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  `),
};

// --- ACTIONS ---

/**
 * Envia notificações de erro diretamente para o e-mail administrador
 */
export async function sendAppErrorLogAction(error: any, context?: string) {
  try {
    const errorMessage =
      error instanceof Error
        ? error.stack || error.message
        : JSON.stringify(error);
    const html = templates.appError(errorMessage, context);

    await transporter.sendMail({
      from: '"Monitoramento Sua Galeria" <app.suagaleria@gmail.com>',
      to: 'app.suagaleria@gmail.com', // E-mail fixo para recebimento de logs
      subject: `⚠️ ERRO CRÍTICO: ${context || 'Aplicação'}`,
      html,
    });

    return { success: true };
  } catch (err) {
    console.error('Falha crítica no sistema de log de e-mail:', err);
    return { success: false };
  }
}

export async function sendAccessRequestAction(data: any) {
  try {
    const html = templates.accessRequest(
      data.name,
      data.email,
      data.whatsapp,
      data.galeriaTitle,
    );
    await transporter.sendMail({
      from: '"Sua Galeria" <app.suagaleria@gmail.com>',
      to: data.photographerEmail,
      subject: `🗝️ Solicitação de Acesso: ${data.galeriaTitle}`,
      html,
    });
    return { success: true };
  } catch (error) {
    // Em caso de erro no envio, notifica o log automaticamente
    await sendAppErrorLogAction(error, 'sendAccessRequestAction');
    return { success: false, error: 'Erro no envio.' };
  }
}
