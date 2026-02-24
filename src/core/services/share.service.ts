import { Galeria } from '@/core/types/galeria';
import { getDefaultMessage } from '../utils/message-formatter';
import { formatMessage } from '../utils/message-helper';

export type ShareType =
  | 'gallery' // Compartilhar galeria completa
  | 'photo' // Compartilhar foto individual
  | 'guest' // Visitante compartilha galeria
  | 'admin'; // Admin envia para cliente

export interface ShareOptions {
  type: ShareType;
  galeria: Galeria;
  url: string;
  photoId?: string;
  phone?: string;
}

/**
 * 🎯 SERVICE PRINCIPAL DE COMPARTILHAMENTO
 * Centraliza toda a lógica de compartilhamento em um único lugar
 */
export class ShareService {
  /**
   * Executa o compartilhamento (nativo ou WhatsApp)
   */
  static async share(options: ShareOptions): Promise<void> {
    const { type, galeria, url, phone } = options;

    // 1. Monta o título e mensagem
    const title = this.getTitle(galeria, type);
    const message = this.getMessage(options);

    // 2. Tenta compartilhamento nativo (mobile)
    if (this.canUseNativeShare()) {
      try {
        await navigator.share({
          title,
          text: message,
        });
        return;
      } catch (error) {
        // Se usuário cancelar, não faz nada
        if ((error as Error).name === 'AbortError') {
          return;
        }
        console.warn('Native share failed, falling back to WhatsApp:', error);
      }
    }

    // 3. Fallback: Abre WhatsApp
    this.openWhatsApp(message, phone);
  }

  /**
   * Verifica se pode usar share nativo
   */
  private static canUseNativeShare(): boolean {
    if (typeof navigator === 'undefined') return false;
    if (!navigator.share) return false;

    // Só usa nativo em mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile;
  }

  /**
   * Abre WhatsApp com mensagem
   */
  private static openWhatsApp(message: string, phone?: string): void {
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const encodedText = encodeURIComponent(message);

    const whatsappUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  }

  /**
   * Retorna o título baseado no tipo
   */
  private static getTitle(galeria: Galeria, type: ShareType): string {
    switch (type) {
      case 'photo':
        return `Foto - ${galeria.title}`;
      case 'guest':
        return `Galeria - ${galeria.title}`;
      case 'admin':
        return `Suas fotos - ${galeria.title}`;
      default:
        return galeria.title;
    }
  }

  /**
   * Retorna a mensagem formatada
   */
  private static getMessage(options: ShareOptions): string {
    const { type, galeria, url } = options;

    // 1. Tenta usar template customizado
    const customTemplate = this.getCustomTemplate(galeria, type);
    if (customTemplate) {
      return formatMessage(customTemplate, galeria, url);
    }

    // 2. Usa mensagem padrão
    return getDefaultMessage(type, galeria.title, url);
  }

  /**
   * Busca template customizado se existir
   */
  private static getCustomTemplate(
    galeria: Galeria,
    type: ShareType,
  ): string | null {
    const templates = galeria.photographer?.message_templates;
    if (!templates) return null;

    switch (type) {
      case 'photo':
        return templates.photo_share || null;
      case 'guest':
        return templates.guest_share || null;
      case 'admin':
        return templates.gallery_share || null;
      default:
        return null;
    }
  }

  /**
   * Copia link para clipboard
   */
  static async copyToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  }
}
