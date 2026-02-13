import { MessageTemplates } from './profile';

// Tipagem da Foto vinda do Google Drive
export interface DrivePhoto {
  id: string;
  name: string;
  size: string;
  thumbnailUrl: string;
  webViewUrl: string;
  width?: number;
  height?: number;
  createdTime?: string;
  imageMediaMetadata?: {
    time?: string;
  };
}

// Perfil do Fotógrafo (Dados do tb_profiles)
export interface Photographer {
  id: string;
  full_name: string;
  username: string;
  profile_picture_url: string | null;
  phone_contact: string | null;
  instagram_link: string | null;
  use_subdomain: boolean; // Essencial para a lógica de URL
  profile_url?: string;
  roles?: string[];
  website?: string | null;
  message_templates?: MessageTemplates;
  plan_key: string;
}

// Interface Base (Reflete exatamente a tabela tb_galerias no Banco)
export interface GaleriaBase {
  id: string;
  title: string;
  client_name: string;
  date: string;
  location: string;
  slug: string;
  cover_image_url: string | null;
  cover_image_ids: string[] | null;
  drive_folder_id: string | null;
  is_public: boolean;
  password: string | null;
  user_id: string;
  category: string;
  has_contracting_client: boolean;
  client_whatsapp: string | null;
  drive_folder_name: string | null;
  is_archived: boolean;
  is_deleted: boolean;
  created_at?: string; // ⬅️ O '?' torna opcional
  updated_at?: string;
  deleted_at: string | null;
  show_cover_in_grid: boolean;
  grid_bg_color: string;
  columns_mobile: number;
  columns_tablet: number;
  columns_desktop: number;
  zip_url_full?: string | null;
  zip_url_social?: string | null;
  show_on_profile: boolean;
  leads_enabled: boolean;
  leads_require_name: boolean;
  leads_require_email: boolean;
  leads_require_whatsapp: boolean;
  lead_purpose?: string;
  rename_files_sequential: boolean;
  photo_count: number;
  enable_favorites: boolean;
  enable_slideshow: boolean;
  google_refresh_token: string | null;
}

// Interface utilizada na UI (GaleriaCard e GaleriaView)
export interface Galeria extends GaleriaBase {
  photographer?: Photographer; // Objeto completo para utilitários
  photographer_name: string;
  photographer_avatar_url: string | null;
  photographer_phone?: string | null;
  photographer_instagram?: string | null;
  photographer_email?: string | null;
  photographer_url?: string;
  photographer_message_templates: MessageTemplates;
  leads_count?: number;

  // Atalhos úteis para facilitar o acesso no GaleriaCard
  photographer_username?: string;
  photographer_id?: string;
  use_subdomain?: boolean;
}

// Interface para a Resposta Bruta do Supabase (Joins)
export interface GaleriaRawResponse extends Omit<
  GaleriaBase,
  'user_id' | 'category'
> {
  category?: string;
  user_id?: string;
  photographer?: {
    id: string;
    full_name: string;
    username: string;
    profile_picture_url: string | null;
    phone_contact: string | null;
    instagram_link: string | null;
    use_subdomain: boolean; // Garante a tipagem correta vinda do DB
    message_templates: MessageTemplates;
    plan_key: string;
    google_refresh_token: string | null;
  };
  leads?: { count: number }[];
}
