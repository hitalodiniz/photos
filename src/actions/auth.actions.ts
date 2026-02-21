'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { authenticateGaleriaAccess } from '@/core/services/galeria.service';
import { cookies, headers } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { emitGaleriaEvent } from '@/core/services/galeria-stats.service';
import { Galeria } from '@/core/types/galeria';
import { UAParser } from 'ua-parser-js';
import { getPublicGalleryUrl } from '@/core/utils/url-helper';

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function getIPLocation(headerList: Headers) {
  const cfIp = headerList.get('cf-connecting-ip');
  const cfCountry = headerList.get('cf-ipcountry');
  if (cfIp && cfCountry) {
    return {
      ip: cfIp,
      city: decodeHeader(headerList.get('cf-ipcity')),
      region: decodeHeader(headerList.get('cf-region-code')),
      country: decodeHeader(cfCountry),
    };
  }

  const vercelIp = headerList.get('x-real-ip');
  const vercelCountry = headerList.get('x-vercel-ip-country');
  if (vercelIp && vercelCountry) {
    return {
      ip: vercelIp,
      city: decodeHeader(headerList.get('x-vercel-ip-city')),
      region: decodeHeader(headerList.get('x-vercel-ip-country-region')),
      country: decodeHeader(vercelCountry),
    };
  }

  const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const res = await fetch(`http://ip-api.com/json/${ip}`);
  const data = await res.json();

  return {
    ip: data.query,
    city: data.city,
    region: data.region,
    country: data.countryCode,
  };
}

/**
 * Server Action para capturar leads e autorizar acesso via cookie
 */
export async function captureLeadAction(
  galeria: Galeria,
  data: {
    nome: string;
    email?: string | null;
    whatsapp?: string | null;
    visitorId?: string | null;
  },
) {
  try {
    const headerList = await headers();
    const cookieStore = await cookies();

    // Mesmo contexto de rastreio do evento para persistir no metadata do lead
    const browserVisitorId = cookieStore.get('visitor_id')?.value;
    const sessionCookie = cookieStore.get(`gsid-${galeria.id}`)?.value;
    const fallbackIp = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const finalVisitorId =
      data.visitorId || browserVisitorId || sessionCookie || fallbackIp;

    const locationData = await getIPLocation(headerList as Headers);
    const ua = headerList.get('user-agent') || '';
    const parser = new UAParser(ua);
    const deviceInfo = {
      os: parser.getOS().name || 'Desconhecido',
      browser: parser.getBrowser().name || 'Desconhecido',
      type: parser.getDevice().type || 'desktop',
    };

    // 1. Limpeza e padronização dos dados (Garante prefixo 55 para WhatsApp do Brasil)
    let cleanWhatsapp = data.whatsapp ? data.whatsapp.replace(/\D/g, '') : null;
    if (
      cleanWhatsapp &&
      (cleanWhatsapp.length === 10 || cleanWhatsapp.length === 11) &&
      !cleanWhatsapp.startsWith('55')
    ) {
      cleanWhatsapp = `55${cleanWhatsapp}`;
    }

    const galeriaUrl = getPublicGalleryUrl(galeria.photographer, galeria.slug);
    const leadMetadata = {
      nome: data.nome,
      email: data.email || null,
      whatsapp: cleanWhatsapp,
      visitor_id: finalVisitorId,
      session_id: sessionCookie || null,
      galeria_title: galeria.title,
      galeria_url: galeriaUrl,
      location: locationData
        ? `${locationData.city || 'N/A'}, ${locationData.region || 'N/A'}`
        : 'Não rastreado',
      location_data: locationData || null,
      user_agent: ua || null,
      device_info: deviceInfo,
      captured_at: new Date().toISOString(),
      is_conversion: !!data.visitorId,
    };

    const supabase = await createSupabaseServerClient();

    // 2. Busca o dono da galeria ANTES para evitar RLS no retorno do insert e para revalidação
    const { data: galeriaOwner } = await supabase
      .from('tb_galerias')
      .select('user_id')
      .eq('id', galeria.id)
      .single();

    const ownerId = galeriaOwner?.user_id;

    // 1. Salva o lead no banco e SOLICITA o retorno dos dados (.select())
    const { data: newLead, error: leadError } = await supabase
      .from('tb_galeria_leads')
      .insert([
        {
          galeria_id: galeria.id,
          name: data.nome,
          email: data.email || null,
          whatsapp: cleanWhatsapp,
          metadata: leadMetadata,
        },
      ])
      .select('id') // 🎯 Isso retorna o ID gerado pelo banco
      .single(); // 🎯 Como é apenas um registro, usamos .single() para facilitar o acesso

    if (leadError) {
      console.error('Erro ao salvar lead:', leadError);
      // Trate o erro conforme sua lógica
    }

    // 4. 🎯 EMISSÃO DO EVENTO DE CONVERSÃO (LEAD)
    // Usamos o visitor_id da VIEW anterior para que o BI entenda que é o mesmo usuário
    // Se não houver, usamos o email ou o novo leadId como fallback
    const trackId = finalVisitorId || data.email || newLead?.id;

    // 3. Emite o evento usando o ID capturado
    await emitGaleriaEvent({
      galeria: galeria,
      eventType: 'lead',
      visitorId: trackId,
      metadata: {
        nome: data.nome,
        email: data.email,
        whatsapp: data.whatsapp,
        is_conversion: !!data.visitorId, // Flag técnica para facilitar queries de BI
      },
    });

    // 4. Tratamento de deduplicação inteligente (erro 23505 = unique_violation, 42501 = RLS violation que esconde unique)
    if (leadError) {
      if (leadError.code === '23505' || leadError.code === '42501') {
        // console.log(`[captureLeadAction] Lead já existente ou bloqueado por RLS (deduplicado): ${data.email || cleanWhatsapp}`);

        if (ownerId) {
          revalidateTag(`user-galerias-${ownerId}`);
        }
      } else {
        console.error('[captureLeadAction] Erro ao salvar lead:', leadError);
        return {
          success: false,
          error: `Erro ao salvar dados: ${leadError.message} (${leadError.code})`,
        };
      }
    } else if (ownerId) {
      // SUCESSO: Revalida o cache do dashboard do fotógrafo para atualizar o leads_count
      // console.log(`[captureLeadAction] Revalidando cache para userId: ${ownerId}`);
      revalidateTag(`user-galerias-${ownerId}`);
    }

    // 5. Define o cookie de acesso (válido por 24h)
    cookieStore.set(`galeria-${galeria.id}-lead`, 'captured', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    });

    return {
      success: true,
      message:
        leadError?.code === '23505' || leadError?.code === '42501'
          ? 'Reconhecido'
          : undefined,
    };
  } catch (error) {
    console.error('[captureLeadAction] Erro crítico:', error);
    return { success: false, error: 'Falha ao processar dados.' };
  }
}

/**
 * Verifica se o usuário tem um refresh token válido do Google
 * Retorna true se o token existe e não está expirado/revogado
 */
export async function checkGoogleRefreshTokenStatus(): Promise<{
  hasValidToken: boolean;
  needsConsent: boolean;
  reason?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Busca o usuário atual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // Se não há usuário logado, não podemos verificar o token no banco porque não temos o userId
      // IMPORTANTE: Isso acontece quando:
      // 1. Primeiro login (usuário nunca fez login antes)
      // 2. Usuário fez logout e está fazendo login novamente
      //
      // Neste caso, não podemos saber se o usuário já tem refresh_token no banco ou não.
      // Por segurança, usamos consent para garantir que sempre recebemos o refresh_token.
      //
      // NOTA: O Google pode retornar refresh_token mesmo com select_account se o usuário já autorizou antes,
      // mas não podemos confiar nisso sem verificar o banco primeiro.
      /* console.log('[checkGoogleRefreshTokenStatus] ⚠️ Usuário não autenticado (sem sessão ativa)');
      console.log('[checkGoogleRefreshTokenStatus] Não é possível verificar token no banco sem userId');
      console.log('[checkGoogleRefreshTokenStatus] Situação: Primeiro login OU usuário fez logout e está fazendo login novamente');
      console.log('[checkGoogleRefreshTokenStatus] Decisão: Usando consent por segurança para garantir refresh_token'); */
      return {
        hasValidToken: false,
        needsConsent: true, // Usa consent quando não há sessão para garantir refresh_token
        reason:
          'Usuário não autenticado - não é possível verificar token sem sessão (pode ser primeiro login ou re-login após logout)',
      };
    }

    // console.log(`[checkGoogleRefreshTokenStatus] Usuário autenticado: ${user.id}, verificando token no banco...`);

    // Busca o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('tb_profiles')
      .select(
        'google_refresh_token, google_auth_status, google_access_token, google_token_expires_at',
      )
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // console.log(`[checkGoogleRefreshTokenStatus] Perfil não encontrado para userId: ${user.id}`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: 'Perfil não encontrado',
      };
    }

    // Verifica se tem refresh token
    if (!profile.google_refresh_token) {
      // console.log(`[checkGoogleRefreshTokenStatus] Refresh token não encontrado para userId: ${user.id}`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: 'Refresh token não encontrado',
      };
    }

    /* console.log(`[checkGoogleRefreshTokenStatus] Refresh token encontrado para userId: ${user.id}`, {
      tokenLength: profile.google_refresh_token.length,
      tokenPreview: profile.google_refresh_token.substring(0, 15) + '...',
      authStatus: profile.google_auth_status,
    }); */

    // Verifica se o status indica problema
    // IMPORTANTE: Se o status for null ou undefined, assume que está ativo (compatibilidade com registros antigos)
    const authStatus = profile.google_auth_status;
    if (authStatus === 'revoked' || authStatus === 'expired') {
      // console.log(`[checkGoogleRefreshTokenStatus] Status indica problema: ${authStatus}`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: `Token ${authStatus}`,
      };
    }

    // Se o status for 'active' ou null/undefined (registros antigos), considera válido se tem token
    if (authStatus && authStatus !== 'active') {
      // console.log(`[checkGoogleRefreshTokenStatus] Status desconhecido: ${authStatus}, assumindo válido se token existe`);
    }

    // 🎯 Validação adicional: Verifica se o refresh token tem formato válido do Google
    // Tokens do Google geralmente começam with "1//0" e têm 50+ caracteres
    const isValidFormat =
      profile.google_refresh_token &&
      (profile.google_refresh_token.startsWith('1//0') ||
        profile.google_refresh_token.length > 30);

    if (!isValidFormat) {
      // console.log(`[checkGoogleRefreshTokenStatus] Token tem formato inválido (pode ser token do Supabase)`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: 'Token com formato inválido',
      };
    }

    // Token válido - não precisa de consent
    // console.log(`[checkGoogleRefreshTokenStatus] ✅ Token válido encontrado para userId: ${user.id}`);
    return {
      hasValidToken: true,
      needsConsent: false,
    };
  } catch (error) {
    console.error(
      '[checkGoogleRefreshTokenStatus] Erro ao verificar token:',
      error,
    );
    // Em caso de erro, assume que precisa de consent para garantir
    return {
      hasValidToken: false,
      needsConsent: true,
      reason: 'Erro ao verificar token',
    };
  }
}

/**
 * Server Action para autenticação de acesso a galerias protegidas
 * Envolve authenticateGaleriaAccess para uso em componentes cliente
 */
export async function authenticateGaleriaAccessAction(
  galeriaId: string,
  fullSlug: string,
  password: string,
) {
  return authenticateGaleriaAccess(galeriaId, fullSlug, password);
}
