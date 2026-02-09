export type SegmentType = 'PHOTOGRAPHER' | 'EVENT' | 'CAMPAIGN' | 'OFFICE';

interface SegmentDictionary {
  singular: string;
  plural: string;
  item: string;
  items: string;
  identity: string;
}

export const SEGMENT_DICTIONARY: Record<SegmentType, SegmentDictionary> = {
  PHOTOGRAPHER: {
    singular: 'fotógrafo',
    plural: 'fotógrafos',
    item: 'foto',
    items: 'fotos',
    identity: 'sua vitrine de fotografia',
  },
  EVENT: {
    singular: 'organizador',
    plural: 'organizadores',
    item: 'evento',
    items: 'eventos',
    identity: 'sua galeria de eventos',
  },
  CAMPAIGN: {
    singular: 'candidato',
    plural: 'candidatos',
    item: 'mídia',
    items: 'mídias',
    identity: 'sua central de campanha',
  },
  OFFICE: {
    singular: 'profissional',
    plural: 'profissionais',
    item: 'arquivo',
    items: 'arquivos',
    identity: 'seu painel de documentos',
  },
};
