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
  slug: string; // Adicionado pois você usa no filtro
  cover_image_url: string | null;
  drive_folder_id: string | null;
  is_public: boolean;
  password: string | null;
  user_id: string; // ID interno para buscar o token do Google
}

export interface GaleriaRawResponse {
  id: string;
  title: string;
  client_name: string;
  date: string;
  location: string;
  cover_image_url: string | null;
  drive_folder_id: string | null;
  is_public: boolean;
  password: string | null;
  photographer?: {
    id: string;
    full_name: string;
    username: string;
    profile_picture_url: string | null;
    phone_contact: string | null;
    instagram_link: string | null;
  };
}
