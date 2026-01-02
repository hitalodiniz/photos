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
}

// Galeria estendida com os dados do fotógrafo e metadados
export interface Galeria extends GaleriaBase {
  photographer?: Photographer;
  photographer_name: string;
  photographer_avatar_url: string | null;
}

// Sua interface base original levemente ajustada
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
  user_id: string; // ID interno para buscar o token do Google
  category: string;
  has_contracting_client: boolean;
  client_whatsapp: string;
  drive_folder_name: string;
}

// Perfil do Fotógrafo (Dados do tb_profiles)
export interface Photographer {
  id: string;
  full_name: string;
  username: string;
  profile_picture_url: string | null;
  phone_contact: string | null;
  instagram_link: string | null;
  use_subdomain: boolean; // Alterado de string | null para boolean para facilitar a lógica
}

// Galeria estendida
export interface Galeria extends GaleriaBase {
  photographer?: Photographer;
  photographer_name: string;
  photographer_avatar_url: string | null;
  // Atalhos úteis para o GaleriaCard
  photographer_username?: string;
  use_subdomain?: boolean;
}

export interface GaleriaRawResponse extends Omit<
  GaleriaBase,
  'user_id' | 'category'
> {
  // O Supabase retorna o join como um objeto opcional
  photographer?: {
    id: string;
    full_name: string;
    username: string;
    profile_picture_url: string | null;
    phone_contact: string | null;
    instagram_link: string | null;
    use_subdomain: boolean; // Garanta que o banco retorna boolean
  };
}
