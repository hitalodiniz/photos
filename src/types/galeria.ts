// types/galeria.ts
export interface Galeria {
  id: string;
  title: string;
  client_name: string;
  date: string;
  cover_image_url: string | null;
  drive_folder_id: string | null;
  is_public: boolean;
  password: string | null;
  photographer_id?: string;
  photographer_name?: string;
  has_contracting_client?: string;
  category?: string
}
