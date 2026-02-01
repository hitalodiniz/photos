import { Galeria } from '@/core/types/galeria';
import { Photographer } from '@/core/types/galeria';

// Mapeamento de tags para facilitar a substituição
const tagMappings = (
  galeria: Partial<Galeria>,
  photographer: Partial<Photographer>,
  publicUrl: string,
  formattedDate: string,
) => ({
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
  '{profissional_email}': '', // Adicionar o email do fotógrafo se disponível
  '{galeria_link}': publicUrl,
});

export const formatMessage = (
  template: string,
  galeria: Galeria,
  publicUrl: string,
) => {
  const photographer = galeria.photographer || {};
  const formattedDate = new Date(galeria.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const mappings = tagMappings(galeria, photographer, publicUrl, formattedDate);
  let message = template;

  for (const [tag, value] of Object.entries(mappings)) {
    message = message.replace(new RegExp(tag, 'g'), value);
  }

  return message;
};
