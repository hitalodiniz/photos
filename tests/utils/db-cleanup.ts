import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL and service role key are required.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface ResetOptions {
  plan_key?: 'FREE' | 'START' | 'PRO';
  is_trial?: boolean;
  expires_in_days?: number;
  keep_galleries?: boolean; // Opção para mudar o plano sem deletar as fotos
}

/**
 * Reseta o estado do usuário para cenários de teste específicos.
 * @returns userId para uso em revalidações de cache.
 */
export async function cleanupAndResetTrialState(
  userEmail: string,
  options: ResetOptions = {},
) {
  // Valores default seguindo sua regra de negócio
  const {
    plan_key = 'FREE',
    is_trial = false,
    expires_in_days = 7,
    keep_galleries = false,
  } = options;

  // 1. Buscar o ID do Perfil
  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (profileError || !profile) {
    throw new Error(`Profile not found for email: ${userEmail}`);
  }

  const userId = profile.id;
  console.log(`[Cleanup] Iniciando reset para ${userEmail} (${plan_key})`);

  // 2. Limpeza de Dados de Negócio (Opcional)
  if (!keep_galleries) {
    const { data: galerias } = await supabase
      .from('tb_galerias')
      .select('id')
      .eq('user_id', userId);

    const galeriaIds = galerias?.map((g) => g.id) || [];

    if (galeriaIds.length > 0) {
      await supabase
        .from('tb_galeria_stats')
        .delete()
        .in('galeria_id', galeriaIds);
      await supabase
        .from('tb_galeria_leads')
        .delete()
        .in('galeria_id', galeriaIds);
      await supabase
        .from('tb_drive_watch_channels')
        .delete()
        .in('galeria_id', galeriaIds);

      // Tenta delete físico
      const { error: deleteError } = await supabase
        .from('tb_galerias')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[Cleanup] Erro no delete físico, tentando soft delete:', deleteError);
        const { error: softError } = await supabase
          .from('tb_galerias')
          .update({ is_deleted: true })
          .eq('user_id', userId);
        
        if (softError) {
          console.error('[Cleanup] Erro no soft delete:', softError);
        } else {
          console.log(`[Cleanup] Soft delete aplicado.`);
        }
      } else {
        console.log(`[Cleanup] ${galeriaIds.length} galerias removidas fisicamente.`);
      }
    }
  }

  // 3. Limpeza de rastro financeiro e notificações
  await supabase.from('tb_notifications').delete().eq('user_id', userId);
  await supabase.from('tb_plan_history').delete().eq('profile_id', userId);
  await supabase.from('tb_upgrade_requests').delete().eq('profile_id', userId);

  // 4. Update do Perfil com os parâmetros do teste
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expires_in_days);

  const { error: updateError } = await supabase
    .from('tb_profiles')
    .update({
      plan_key,
      is_trial,
      plan_trial_expires: expirationDate.toISOString(),
      updated_at: new Date().toISOString(),
      accepted_terms: true, // Garante que não cai no onboarding e redireciona
      accepted_at: new Date().toISOString(),
      accepted_ip: '127.0.0.1',
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  console.log(`[Cleanup] Sucesso: Plano=${plan_key}, Trial=${is_trial}`);
  return userId; // Retorna para o Playwright usar na rota de revalidate
}

export async function injectTestGalleries(
  userEmail: string,
  count: number,
  options?: {
    show_on_profile?: boolean;
    has_contracting_client?: 'CB' | 'CT' | 'ES';
  },
) {
  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (profileError || !profile) {
    throw new Error(`Profile not found for email: ${userEmail}`);
  }

  const userId = profile.id;

  const showOnProfile = options?.show_on_profile ?? false;
  const hasContractingClient = options?.has_contracting_client ?? 'CB';

  const galleries = Array.from({ length: count }).map((_, index) => ({
    user_id: userId,
    title: `Galeria Injetada ${index + 1}`,
    client_name: 'Teste',
    slug: `galeria-injetada-${userId.split('-')[0]}-${index + 1}-${Date.now()}`,
    category: 'Teste',
    date: new Date().toISOString().split('T')[0],
    photo_count: 10,
    is_public: true,
    is_archived: false,
    is_deleted: false,
    has_contracting_client: hasContractingClient,
    show_cover_in_grid: false,
    grid_bg_color: '#ffffff',
    columns_mobile: 2,
    columns_tablet: 3,
    columns_desktop: 4,
    show_on_profile: showOnProfile,
    leads_enabled: false,
    leads_require_name: false,
    leads_require_email: false,
    leads_require_whatsapp: false,
    rename_files_sequential: false,
    enable_favorites: false,
    enable_slideshow: false,
    drive_folder_id: `mock-drive-id-${Date.now()}-${index}`, // Injeta um ID mock para passar na constraint NOT NULL
    cover_image_ids: [],
  }));

  const { error } = await supabase.from('tb_galerias').insert(galleries);

  if (error) {
    console.error('[Inject] Erro ao injetar galerias:', error);
    throw error;
  }

  console.log(`[Inject] ${count} galerias injetadas com sucesso.`);
}
