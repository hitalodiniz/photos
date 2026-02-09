import { SegmentType } from '@/core/config/segments';

export function getThemeFavicon(segment: SegmentType) {
  const colors: Record<SegmentType, string> = {
    // #F3E5AB (Bege) - PHOTOGRAPHER
    PHOTOGRAPHER: '%23F3E5AB',

    // #FF477E (Pink) - EVENT
    EVENT: '%23FF477E',

    // #10B981 (Emerald-500) - OFFICE (Diferenciado para Mandato/Transparência)
    OFFICE: '%2310B981',

    // #D4D4D8 (Zinc-300/Prata) - CAMPAIGN (Sobre o fundo Midnight)
    CAMPAIGN: '%23B87351',
  };

  const color = colors[segment] || colors.PHOTOGRAPHER;

  // Conteúdo do ícone baseado no dicionário de segmentos
  const iconContent: Record<SegmentType, string> = {
    PHOTOGRAPHER:
      "<path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'/><circle cx='12' cy='13' r='3'/>",
    CAMPAIGN:
      "<path d='m3 11 18-5v12L3 14v-3z'/><path d='M11.6 16.8a3 3 0 1 1-5.8-1.6'/>", // Megaphone
    EVENT:
      "<rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/>",
    OFFICE:
      "<line x1='2' x2='22' y1='22' y2='22'/><line x1='8' x2='8' y1='11' y2='18'/><line x1='12' x2='12' y1='11' y2='18'/><line x1='16' x2='16' y1='11' y2='18'/><path d='M3 11h18'/><path d='m12 2 9 9H3z'/>", // Landmark
  };

  const content = iconContent[segment] || iconContent.PHOTOGRAPHER;

  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${content}</svg>`;
}
