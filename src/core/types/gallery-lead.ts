// Tipo para Lead de Galeria
export interface GalleryLead {
  id: string;
  galeria_id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  created_at: string;
  updated_at: string;
}

// Tipo para criar um novo lead
export interface CreateGalleryLeadInput {
  galeria_id: string;
  name: string;
  email: string;
  whatsapp?: string;
}

// Tipo para resposta de criação
export interface CreateLeadResult {
  success: boolean;
  message?: string;
  error?: string;
  lead?: GalleryLead;
}

// Tipo para estatísticas de leads por galeria
export interface GalleryLeadStats {
  galeria_id: string;
  total_leads: number;
  leads_with_whatsapp: number;
  latest_lead_date: string | null;
}
