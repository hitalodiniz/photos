'use server';

import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { cookies, headers } from 'next/headers';
import { createInternalNotification } from './notification.service';
import { UAParser } from 'ua-parser-js';
import { Galeria } from '../types/galeria';

interface GaleriaEventPayload {
  galeria: Galeria;
  eventType: 'view' | 'lead' | 'download' | 'share';
  visitorId?: string;
  metadata?: any;
}

/**
 * 🌍 Captura a localização via IP
 */
async function getIPLocation(ip: string) {
  let targetIp = ip;
  if (
    !targetIp ||
    targetIp === 'unknown' ||
    targetIp === '127.0.0.1' ||
    targetIp === '::1'
  ) {
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      targetIp = ipData.ip;
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(`https://ipapi.co/${targetIp}/json/`);
    const data = await res.json();
    if (data.error) return null;
    return {
      city: data.city,
      region: data.region_code,
      country: data.country_code,
      ip: targetIp,
    };
  } catch {
    return null;
  }
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
  if (ignoredIds.includes(finalVisitorId)) {
    console.log(
      `🚫 [BI] Ignorado: ${eventType} por ID interno ${finalVisitorId}`,
    );
    return;
  }

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

  const locationData = await getIPLocation(ip);
  const ua = headerList.get('user-agent') || '';
  const parser = new UAParser(ua);

  const deviceInfo = {
    os: parser.getOS().name || 'Desconhecido',
    browser: parser.getBrowser().name || 'Desconhecido',
    type: parser.getDevice().type || 'desktop',
  };

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
          location: locationData
            ? `${locationData.city}, ${locationData.region}`
            : 'Não rastreado',
          session_id: sessionCookie,
        },
      },
    ])
    .select()
    .single();

  if (insertError) return;

  // 5. Notificações
  await handleNotifications(
    eventType,
    galeria,
    newEvent,
    metadata,
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

  const locBadge = loc ? ` em ${loc.city}/${loc.region}` : '';
  const config: Record<string, any> = {
    view: {
      title: `👀 Novo Acesso${locBadge}`,
      type: 'info',
      msg: `Galeria "${galeria.title}" visualizada.`,
    },
    lead: {
      title: `👤 Visitante Identificado${locBadge}`,
      type: 'success',
      msg: `${metadata.nome || 'Um visitante'} entrou.`,
    },
    download: {
      title: `📥 Download Realizado${locBadge}`,
      type: 'info',
      msg: `Fotos baixadas.`,
    },
    share: {
      title: `📤 Compartilhamento${locBadge}`,
      type: 'info',
      msg: `Galeria compartilhada.`,
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
    download: 'Download de Fotos',
    share: 'Compartilhamento',
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
