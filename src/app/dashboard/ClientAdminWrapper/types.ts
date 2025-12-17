// app/dashboard/ClientAdminWrapper/types.ts
export interface Galeria {
  id: string;
  user_id: string;
  studio_id: string;
  title: string;
  slug: string;
  date: string;
  location: string | null;
  client_name: string;
  client_whatsapp: string | null;
  drive_folder_id: string;
  is_public: boolean;
  password: string | null;
  cover_image_url: string | null;
  drive_folder_name: string;
}
