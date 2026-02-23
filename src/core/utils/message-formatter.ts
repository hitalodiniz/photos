import { Galeria, Photographer } from '@/core/types/galeria';
import { ShareType } from '@/core/services/share.service';
import { GALLERY_MESSAGES } from '../config/messages';

/**
 * Mapeia tags para valores da galeria
 */
function getTagMappings(
  galeria: Partial<Galeria>,
  photographer: Partial<Photographer>,
  publicUrl: string,
  formattedDate: string,
): Record<string, string> {
  return {
    '{cliente}': galeria.client_name || 'Cliente',
    '{galeria}': galeria.title || '',
    '{data}': formattedDate,
    '{link}': publicUrl,
    '{galeria_titulo}': galeria.title || '',
    '{galeria_nome_cliente}': galeria.client_name || 'Cliente',
    '{galeria_data}': formattedDate,
    '{galeria_local}': galeria.location || '',
    '{galeria_categoria}': galeria.category || '',
    '{galeria_senha}': galeria.password || '',
    '{profissional_nome}': photographer.full_name || '',
    '{profissional_fone}': photographer.phone_contact || '',
    '{profissional_instagram}': photographer.instagram_link || '',
    '{profissional_link_perfil}': photographer.profile_url || '',
    '{galeria_link}': publicUrl,
  };
}

/**
 * 🎯 Formata mensagem com template customizado
 */
export function formatMessage(
  template: string,
  galeria: Galeria,
  publicUrl: string,
): string {
  const photographer = galeria.photographer || {};
  const formattedDate = new Date(galeria.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const mappings = getTagMappings(
    galeria,
    photographer,
    publicUrl,
    formattedDate,
  );
  let message = template;

  // Substitui todas as tags
  for (const [tag, value] of Object.entries(mappings)) {
    message = message.replace(new RegExp(tag, 'g'), value);
  }

  return message;
}

/**
 * 🎯 Retorna mensagem padrão baseada no tipo
 */
export function getDefaultMessage(
  type: ShareType,
  galleryTitle: string,
  url: string,
): string {
  switch (type) {
    case 'photo':
      return GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, url);
    case 'guest':
      return GALLERY_MESSAGES.GUEST_SHARE(galleryTitle, url);
    case 'admin':
    case 'gallery':
      return GALLERY_MESSAGES.CARD_SHARE(galleryTitle, url);
    default:
      return GALLERY_MESSAGES.GUEST_SHARE(galleryTitle, url);
  }
}
