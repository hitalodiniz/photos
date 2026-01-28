import { z } from 'zod';

export const UserSettingsSchema = z.object({
  display: z.object({
    show_contract_type: z.boolean().default(true),
  }),
  defaults: z.object({
    list_on_profile: z.boolean().default(false),
    enable_guest_registration: z.boolean().default(false),
    required_guest_fields: z.array(z.string()).default(['name', 'whatsapp']),
    data_treatment_purpose: z.string().default(''),
    background_color: z.string().default('#FFFFFF'),
    background_photo: z.string().default(''),
    grid_mobile: z.number().min(1).max(6).default(2),
    grid_tablet: z.number().min(1).max(6).default(3),
    grid_desktop: z.number().min(1).max(10).default(4),
  }),
});

export const MessageTemplatesSchema = z.object({
  luxury_share: z.string().default(''),
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
}
