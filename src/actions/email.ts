'use server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAccessRequestAction(data: {
  name: string;
  email: string;
  whatsapp: string;
  galeriaTitle: string;
  photographerEmail: string;
}) {
  try {
    const { name, email, whatsapp, galeriaTitle, photographerEmail } = data;

    const response = await resend.emails.send({
      from: 'Sua Galeria de Fotos <onboarding@resend.dev>', // No plano grátis, só envia para você mesmo
      // to: [photographerEmail],
      to: 'app.suagaleria@gmail.com',

      subject: `🗝️ Solicitação de Acesso: ${galeriaTitle}`,
      html: `
        <div style="font-family: sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px;">
          <h2 style="color: #F3E5AB; font-style: italic;">Nova Solicitação de Acesso</h2>
          <p>O cliente <strong>${name}</strong> deseja acessar a galeria <strong>${galeriaTitle}</strong>.</p>
          <div style="background: #1A1A1A; padding: 20px; border-radius: 12px; border: 1px solid #333;">
            <p><strong>E-mail:</strong> ${email}</p>
            <p><strong>WhatsApp:</strong> ${whatsapp}</p>
          </div>
          <p style="font-size: 10px; color: #666; margin-top: 20px;">Enviado automaticamente pela sua plataforma de fotografia.</p>
        </div>
      `,
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return { success: false, error: 'Falha interna ao processar envio.' };
  }
}
