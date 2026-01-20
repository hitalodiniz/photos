import { createSupabaseClientForCache } from '@/lib/supabase.server';
import type {
  CreateGalleryLeadInput,
  CreateLeadResult,
  GalleryLead,
  GalleryLeadStats,
} from '@/core/types/gallery-lead';

/**
 * Cria um novo lead para uma galeria
 * 🎯 Esta função é pública e não requer autenticação
 */
export async function createGalleryLead(
  input: CreateGalleryLeadInput,
): Promise<CreateLeadResult> {
  try {
    // 🎯 Usa cliente anon para inserção pública (RLS deve permitir INSERT)
    const supabase = createSupabaseClientForCache();

    console.log('[createGalleryLead] Iniciando criação de lead:', {
      galeria_id: input.galeria_id,
      name: input.name,
      email: input.email,
      hasWhatsapp: !!input.whatsapp,
    });

    // Validação básica
    if (!input.galeria_id || !input.name || !input.email) {
      console.error('[createGalleryLead] Dados obrigatórios não fornecidos:', input);
      return {
        success: false,
        error: 'Dados obrigatórios não fornecidos',
      };
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      console.error('[createGalleryLead] Email inválido:', input.email);
      return {
        success: false,
        error: 'Email inválido',
      };
    }

    // Verifica se a galeria existe e se está habilitada para captura
    console.log('[createGalleryLead] Verificando galeria:', input.galeria_id);
    const { data: gallery, error: galleryError } = await supabase
      .from('tb_galerias')
      .select('id, enable_lead_capture, user_id')
      .eq('id', input.galeria_id)
      .single();

    if (galleryError) {
      console.error('[createGalleryLead] Erro ao buscar galeria:', galleryError);
      return {
        success: false,
        error: 'Galeria não encontrada',
      };
    }

    if (!gallery) {
      console.error('[createGalleryLead] Galeria não encontrada:', input.galeria_id);
      return {
        success: false,
        error: 'Galeria não encontrada',
      };
    }

    console.log('[createGalleryLead] Galeria encontrada:', {
      id: gallery.id,
      enable_lead_capture: gallery.enable_lead_capture,
    });

    // Normaliza o WhatsApp (remove formatação)
    const whatsapp = input.whatsapp
      ? input.whatsapp.replace(/\D/g, '')
      : null;

    // Insere o lead
    console.log('[createGalleryLead] Inserindo lead no banco...');
    const { data: lead, error } = await supabase
      .from('tb_galeria_leads')
      .insert([
        {
          galeria_id: input.galeria_id,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          whatsapp: whatsapp || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[createGalleryLead] Erro ao inserir lead:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        success: false,
        error: `Erro ao salvar os dados: ${error.message || 'Erro desconhecido'}`,
      };
    }

    if (!lead) {
      console.error('[createGalleryLead] Lead não foi retornado após inserção');
      return {
        success: false,
        error: 'Erro ao salvar os dados. Tente novamente.',
      };
    }

    console.log('[createGalleryLead] Lead criado com sucesso:', {
      id: lead.id,
      galeria_id: lead.galeria_id,
      email: lead.email,
    });

    // 🎯 Revalida cache da galeria para atualizar estatísticas
    try {
      const { revalidateTag } = await import('next/cache');
      if (gallery?.user_id) {
        revalidateTag(`user-galerias-${gallery.user_id}`);
        console.log('[createGalleryLead] Cache revalidado para user_id:', gallery.user_id);
      }
    } catch (revalidateError) {
      console.warn('[createGalleryLead] Erro ao revalidar cache (não crítico):', revalidateError);
    }

    return {
      success: true,
      message: 'Dados salvos com sucesso!',
      lead: lead as GalleryLead,
    };
  } catch (error) {
    console.error('[createGalleryLead] Erro inesperado:', error);
    return {
      success: false,
      error: 'Erro inesperado. Tente novamente.',
    };
  }
}

/**
 * Busca todos os leads de uma galeria
 * 🎯 Requer autenticação (apenas o dono da galeria pode ver)
 */
export async function getGalleryLeads(
  galleryId: string,
): Promise<{ success: boolean; leads?: GalleryLead[]; error?: string }> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/supabase.server');
    const supabase = await createSupabaseServerClient();

    const { data: leads, error } = await supabase
      .from('tb_galeria_leads')
      .select('*')
      .eq('galeria_id', galleryId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar leads:', error);
      return {
        success: false,
        error: 'Erro ao buscar leads',
      };
    }

    return {
      success: true,
      leads: leads as GalleryLead[],
    };
  } catch (error) {
    console.error('Erro inesperado ao buscar leads:', error);
    return {
      success: false,
      error: 'Erro inesperado ao buscar leads',
    };
  }
}

/**
 * Busca estatísticas de leads por galeria
 */
export async function getGalleryLeadStats(
  galleryId: string,
): Promise<{ success: boolean; stats?: GalleryLeadStats; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: leads, error } = await supabase
      .from('tb_galeria_leads')
      .select('whatsapp, created_at')
      .eq('galeria_id', galleryId);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        success: false,
        error: 'Erro ao buscar estatísticas',
      };
    }

    const stats: GalleryLeadStats = {
      galeria_id: galleryId,
      total_leads: leads?.length || 0,
      leads_with_whatsapp:
        leads?.filter((lead) => lead.whatsapp).length || 0,
      latest_lead_date:
        leads && leads.length > 0
          ? leads.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )[0].created_at
          : null,
    };

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error('Erro inesperado ao buscar estatísticas:', error);
    return {
      success: false,
      error: 'Erro inesperado ao buscar estatísticas',
    };
  }
}

/**
 * Busca estatísticas de leads para múltiplas galerias (para o dashboard)
 * 🎯 Requer autenticação (apenas o dono das galerias pode ver)
 */
export async function getMultipleGalleryLeadStats(
  galleryIds: string[],
): Promise<{
  success: boolean;
  stats?: Record<string, GalleryLeadStats>;
  error?: string;
}> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/supabase.server');
    const supabase = await createSupabaseServerClient();

    const { data: leads, error } = await supabase
      .from('tb_galeria_leads')
      .select('galeria_id, whatsapp, created_at')
      .in('galeria_id', galleryIds);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        success: false,
        error: 'Erro ao buscar estatísticas',
      };
    }

    // Agrupa por galeria
    const statsByGallery: Record<string, GalleryLeadStats> = {};

    galleryIds.forEach((galleryId) => {
      const galleryLeads = leads?.filter(
        (lead) => lead.galeria_id === galleryId,
      ) || [];

      statsByGallery[galleryId] = {
        galeria_id: galleryId,
        total_leads: galleryLeads.length,
        leads_with_whatsapp:
          galleryLeads.filter((lead) => lead.whatsapp).length,
        latest_lead_date:
          galleryLeads.length > 0
            ? galleryLeads.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )[0].created_at
            : null,
      };
    });

    return {
      success: true,
      stats: statsByGallery,
    };
  } catch (error) {
    console.error('Erro inesperado ao buscar estatísticas:', error);
    return {
      success: false,
      error: 'Erro inesperado ao buscar estatísticas',
    };
  }
}
