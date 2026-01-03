// Tipagem da Foto vinda do Google Drive
export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailLink: string;
  webContentLink: string; // Link de alta resolução
  mimeType: string;
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
  drive_folder_id: string | null;
  is_public: boolean;
  password: string | null;
  user_id: string;
  category: string;
  has_contracting_client: boolean;
  client_whatsapp: string | null;
  drive_folder_name: string | null;
}

// Interface utilizada na UI (GaleriaCard e GaleriaView)
export interface Galeria extends GaleriaBase {
  photographer?: Photographer; // Objeto completo para utilitários
  photographer_name: string;
  photographer_avatar_url: string | null;
  photographer_phone?: string | null;
  photographer_instagram?: string | null;

  // Atalhos úteis para facilitar o acesso no GaleriaCard
  photographer_username?: string;
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
  };
}
