'use server';

import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { cookies, headers } from 'next/headers';
import { createInternalNotification } from './notification.service';
import { UAParser } from 'ua-parser-js';
import { Galeria } from '../types/galeria';
import { getPublicGalleryUrl } from '../utils/url-helper';

interface GaleriaEventPayload {
  galeria: Galeria;
  eventType:
    | 'view'
    | 'lead'
    | 'download'
    | 'download_favorites'
    | 'share'
    | 'selection';
  visitorId?: string;
  metadata?: any;
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 🌍 Captura a localização via IP
 */
async function getIPLocation(headerList: Headers) {
  // 1. Cloudflare
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

  // 2. Vercel
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

  // 3. Fallback: ip-api.com
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
 * 🎯 MAESTRO: EMISSÃO DE EVENTOS
 */
export async function emitGaleriaEvent({
  galeria,
  eventType,
  visitorId: providedVisitorId,
  metadata = {},
}: GaleriaEventPayload) {
  const supabase = await createSupabaseClientForCache();
  const headerList = await headers();
  const cookieStore = await cookies();

  // 1. Definição de Visitor ID
  // 🎯 IMPORTANTE: Lemos 'visitor_id' (o fixo do browser) antes do 'gsid' (sessão volátil)
  const browserVisitorId = cookieStore.get('visitor_id')?.value;
  const sessionCookie = cookieStore.get(`gsid-${galeria.id}`)?.value;

  // Prioridade: Lead (e-mail) > Cookie do Browser (Sincronizado) > Sessão > IP
  const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const finalVisitorId =
    providedVisitorId || browserVisitorId || sessionCookie || ip;

  // 2. FILTRO DE TRÁFEGO INTERNO (FOTÓGRAFO)
  const photographerId = galeria.user_id || galeria.photographer_id;
  const currentUserId = metadata?.currentUserId; // O ID de quem está logado vendo a página

  if (currentUserId && currentUserId === photographerId) {
    console.log('🚫 [BI] Fotógrafo detectado pela sessão. Ignorando View.');
    return;
  }

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('ignored_visitor_ids')
    .eq('id', photographerId)
    .single();

  const ignoredIds = profile?.ignored_visitor_ids || [];

  // Se o ID atual estiver na lista de bloqueio do fotógrafo, abortamos tudo
  // if (ignoredIds.includes(finalVisitorId)) {
  //   console.log(
  //     `🚫 [BI] Ignorado: ${eventType} por ID interno ${finalVisitorId}`,
  //   );
  //   return;
  // }

  // 3. Trava de Duplicidade (Apenas para View)
  if (eventType === 'view') {
    const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('tb_galeria_stats')
      .select('id')
      .eq('galeria_id', galeria.id)
      .eq('event_type', 'view')
      .eq('visitor_id', finalVisitorId)
      .gt('created_at', timeLimit)
      .limit(1);

    if (recent && recent.length > 0) return;
  }

  const locationData = await getIPLocation(headerList as Headers);
  const ua = headerList.get('user-agent') || '';
  const parser = new UAParser(ua);

  const deviceInfo = {
    os: parser.getOS().name || 'Desconhecido',
    browser: parser.getBrowser().name || 'Desconhecido',
    type: parser.getDevice().type || 'desktop',
  };

  const galeriaUrl = getPublicGalleryUrl(galeria.photographer, galeria.slug);
  // 4. Gravação no Banco
  const { data: newEvent, error: insertError } = await supabase
    .from('tb_galeria_stats')
    .insert([
      {
        galeria_id: galeria.id,
        event_type: eventType,
        visitor_id: finalVisitorId,
        device_info: deviceInfo,
        metadata: {
          ...metadata,
          galeria_title: galeria.title, // 👈 Título para o Menu
          galeria_url: galeriaUrl, // 👈 URL para o Menu
          location: locationData
            ? `${locationData.city}, ${locationData.region}`
            : 'Não rastreado',
          session_id: sessionCookie,
        },
      },
    ]);

  if (insertError) {
    // ESTE LOG É VITAL NA VERCEL
    console.error(
      '❌ [BI Error] falha ao gravar stat:',
      insertError.message,
      insertError.details,
    );
    return;
  }

  // 5. Notificações
  await handleNotifications(
    eventType,
    galeria,
    newEvent,
    { ...metadata, galeria_title: galeria.title, galeria_url: galeriaUrl },
    locationData,
  );
}

async function handleNotifications(
  type: string,
  galeria: any,
  event: any,
  metadata: any,
  loc: any,
) {
  const userId = galeria.user_id || galeria.photographer_id;
  if (!userId) return;

  // 1. Tratamento robusto da localização
  // Filtra apenas valores que existem e não são strings "undefined"/"null"
  const locationParts = [loc?.city, loc?.region].filter(
    (val) => val && val !== 'undefined' && val !== 'null',
  );

  // Se houver partes válidas, junta com "/", se não, string vazia
  const locString = locationParts.length > 0 ? locationParts.join('/') : '';
  const locBadgeFormatted = locString ? ` em ${locString}` : '';

  // Limpeza do nome do visitante
  const visitorName =
    metadata.nome && metadata.nome !== 'undefined' && metadata.nome !== 'null'
      ? metadata.nome
      : 'Um visitante';

  const config: Record<string, any> = {
    view: {
      title: `👀 Novo Acesso${locBadgeFormatted}`,
      type: 'info',
      msg: `Galeria "${galeria.title}" visualizada.`,
    },
    lead: {
      title: `👤 Visitante Identificado${locBadgeFormatted}`,
      type: 'success',
      msg: `${visitorName} entrou.`, // Usando o nome sanitizado aqui
    },
    download: {
      title: `📥 Download Completo${locBadgeFormatted}`,
      type: 'info',
      msg: `${metadata.count || 'Todas as'} fotos da galeria "${galeria.title}" baixadas.`,
    },
    // ✅ NOVO: Evento específico para favoritas
    download_favorites: {
      title: `💖 Download de Favoritas${locBadgeFormatted}`,
      type: 'success',
      msg: `${metadata.count} ${metadata.count === 1 ? 'foto favorita' : 'fotos favoritas'} da galeria "${galeria.title}" ${metadata.count === 1 ? 'baixada' : 'baixadas'}.`,
    },
    share: {
      title: `📤 Compartilhamento${locBadgeFormatted}`,
      type: 'info',
      msg: `Galeria "${galeria.title}" compartilhada.`,
    },
    selection: {
      title: `🎯 Fotos Selecionadas${locBadgeFormatted}`,
      type: 'info',
      msg: `Fotos da galeria "${galeria.title}" selecionadas.`,
    },
  };
  const item = config[type];
  if (!item || (type === 'view' && galeria.leads_enabled)) return;

  await createInternalNotification({
    userId,
    title: item.title,
    message: item.msg,
    type: item.type,
    link: `/dashboard/galerias/${galeria.id}/stats`,
    eventData: event,
    // Esta rotina roda durante render da galeria pública; revalidatePath é proibido nesse contexto.
    shouldRevalidateDashboard: false,
  });
}

/**
 * 📊 Consolida os dados para o Relatório (Filtra a saída)
 * Otimizado para evitar processamento desnecessário se não houver dados
 */
export async function getGaleriaEventReport(galeriaId: string) {
  const supabase = await createSupabaseClientForCache();

  // 1. Busca IDs ignorados e dados do dono em uma única query
  const { data: galeriaData, error: galeriaError } = await supabase
    .from('tb_galerias')
    .select(
      `
      user_id, 
      photographer:tb_profiles!inner ( ignored_visitor_ids )
    `,
    )
    .eq('id', galeriaId)
    .single();

  if (galeriaError || !galeriaData) return { rawEvents: [], topBrowsers: [] };

  const ignoredIds =
    (galeriaData.photographer as any)?.ignored_visitor_ids || [];

  // 2. Query de eventos com filtro de exclusão
  let query = supabase
    .from('tb_galeria_stats')
    .select('*')
    .eq('galeria_id', galeriaId);

  if (ignoredIds.length > 0) {
    // 🎯 PostgREST format correto para strings/UUIDs: ("id1","id2")
    // Note: Usamos join com "," e envolvemos em parênteses.
    const formattedIds = `(${ignoredIds.map((id: string) => `"${id}"`).join(',')})`;
    query = query.not('visitor_id', 'in', formattedIds);
  }

  const { data, error: eventsError } = await query.order('created_at', {
    ascending: false,
  });

  if (eventsError || !data) return { rawEvents: [], topBrowsers: [] };

  const eventLabels: Record<string, string> = {
    view: 'Visualização',
    lead: 'Cadastro de Visitante',
    download: 'Download Completo',
    download_favorites: 'Download de Favoritas', // ✅ Adicionado
    share: 'Compartilhamento',
    selection: 'Seleção de Fotos', // ✅ Adicionado
  };

  // 3. Processamento de métricas (Baixo custo: feito em uma única iteração)
  const browserCounts: Record<string, number> = {};

  const formattedEvents = data.map((e) => {
    // Contagem de browsers para o gráfico
    const b = e.device_info?.browser || 'Outros';
    browserCounts[b] = (browserCounts[b] || 0) + 1;

    return {
      ...e,
      event_label: eventLabels[e.event_type] || e.event_type,
      location: e.metadata?.location || 'Não rastreado',
    };
  });

  const topBrowsers = Object.entries(browserCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    rawEvents: formattedEvents,
    topBrowsers,
  };
}
