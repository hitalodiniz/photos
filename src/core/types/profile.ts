import { z } from 'zod';
import { PlanKey } from '../config/plans';

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  mini_bio?: string;
  phone_contact?: string;
  /** E-mail (pode vir do auth ou de tb_profiles quando gravado). */
  email?: string | null;
  instagram_link?: string;
  website?: string;
  operating_cities: string[];
  profile_picture_url?: string;
  background_url?: string[];

  // 🛡️ Campos de Plano e Trial
  plan_key: PlanKey;
  plan_trial_expires?: string; // ISO Date
  is_trial: boolean;
  /** Usuário isento: acesso vitalício ao plan_key atual; ignora expiração/downgrade. */
  is_exempt?: boolean;

  created_at: string;
  updated_at: string;

  settings: UserSettings;
  message_templates: MessageTemplates;

  // 🛠️ Campos Adicionais para Dashboard e Admin
  google_refresh_token: string | null;
  sidebar_collapsed?: boolean;
  roles?: string[];
  accepted_terms: boolean;
  accepted_at: string;
  specialty?: string;
  custom_specialties?: string[];
  theme_key?: string; // PHOTOGRAPHER | DARK_CINEMA | EDITORIAL_WHITE | NATURE | NOCTURNAL_LUXURY | OFF_WHITE | PLATINUM | WARM_BLUSH
  /** Plano pago anterior (ex.: antes de downgrade por inadimplência), para reativação. */
  last_paid_plan?: PlanKey | string | null;
  /** Último tema Elite antes de downgrade; usado na reativação PRO/PREMIUM. */
  last_paid_theme_key?: string | null;
  /** Campo JSONB para metadados diversos (ex.: last_downgrade_alert_viewed). */
  metadata?: Record<string, unknown> | null;
}

// 🎯 Zod Schema atualizado para suportar o novo JSON
export const UserSettingsSchema = z.object({
  display: z.object({
    // Mantemos o booleano para compatibilidade, mas o default_type é o novo padrão
    show_contract_type: z.boolean().default(true),
    default_type: z.enum(['contract', 'event', 'ensaio']).default('contract'),
  }),
  defaults: z.object({
    is_public: z.boolean().default(true), // 👈 Adicionado campo de privacidade padrão
    list_on_profile: z.boolean().default(false),
    show_phone_on_public_profile: z.boolean().default(true), // exibir WhatsApp no perfil público
    google_drive_root_id: z.string().default(''), // ID da pasta inicial
    google_drive_root_name: z.string().default(''), // Nome da pasta inicial
    rename_files_sequential: z.boolean().default(false), // Padrão de renomeação
    enable_guest_registration: z.boolean().default(false),
    required_guest_fields: z.array(z.string()).default(['name', 'whatsapp']),
    data_treatment_purpose: z
      .string()
      .default('Visualização de galeria fotográfica'),
    background_color: z.string().default('#FFFFFF'),
    background_photo: z.string().default(''),
    grid_mobile: z.number().min(1).max(6).default(2),
    grid_tablet: z.number().min(1).max(6).default(3),
    grid_desktop: z.number().min(1).max(10).default(4),
    enable_favorites: z.boolean().default(false),
    enable_slideshow: z.boolean().default(false),
  }),
});

export const MessageTemplatesSchema = z.object({
  CARD_SHARE: z.string().default(''),
  card_share: z.string().default(''),
  photo_share: z.string().default(''),
  guest_share: z.string().default(''),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type MessageTemplates = z.infer<typeof MessageTemplatesSchema>;

export interface ProfileWithSettings {
  id: string;
  username: string;
  full_name: string;
  settings: UserSettings;
  message_templates: MessageTemplates;

  // 🛠️ Campos Adicionais para Dashboard e Admin
  google_refresh_token?: string | null;
  sidebar_collapsed?: boolean;
  roles?: string[];
}
