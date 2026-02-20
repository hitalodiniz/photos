'use server';

import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { cookies, headers } from 'next/headers';
import { createInternalNotification } from './notification.service';
import { UAParser } from 'ua-parser-js';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { Galeria } from '../types/galeria';

interface GaleriaEventPayload {
  galeria: Galeria;
  eventType: 'view' | 'lead' | 'download' | 'share';
  visitorId?: string;
  metadata?: any;
}

/**
 * 🌍 Captura a localização via IP (Service Side)
 */
async function getIPLocation(ip: string) {
  let targetIp = ip;

  // 🎯 GATILHO PARA LOCALHOST: Se o IP for interno, busca o IP público real da máquina
  if (
    !targetIp ||
    targetIp === 'unknown' ||
    targetIp === '127.0.0.1' ||
    targetIp === '::1'
  ) {
    try {
      // Busca o seu IP real na internet para poder testar a geolocalização
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      targetIp = ipData.ip;
    } catch (e) {
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
      ip: targetIp, // Retornamos o IP real para gravar na tb_galeria_stats
    };
  } catch {
    return null;
  }
}

/**
 * 🎯 FUNÇÃO ÚNICA DE EMISSÃO DE EVENTOS
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

  // 1. Definição de Visitor ID Persistente
  // Prioridade: 1. ID fornecido (Lead) | 2. Cookie de Sessão | 3. IP (Fallback)
  const sessionCookieName = `gsid-${galeria.id}`;
  const sessionCookie = cookieStore.get(sessionCookieName)?.value;

  let ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const locationData = await getIPLocation(ip);
  if (locationData?.ip) ip = locationData.ip;

  // Se for um LEAD, o visitorId vindo do form (ex: email)
  // deve ser o mesmo usado na VIEW anterior via cookie.
  const finalVisitorId = providedVisitorId || sessionCookie || ip;

  // 2. Trava de Duplicidade Inteligente
  // Evita contar múltiplos 'views' do mesmo gsid/ip em menos de 24h
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

  // 3. Captura de Device
  const ua = headerList.get('user-agent') || '';
  const parser = new UAParser(ua);
  const deviceInfo = {
    os: parser.getOS().name || 'Desconhecido',
    browser: parser.getBrowser().name || 'Desconhecido',
    type: parser.getDevice().type || 'desktop',
  };

  // 4. Gravação com Metadata de Conversão
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
          session_id: sessionCookie, // Ajuda a agrupar no BI
        },
      },
    ])
    .select()
    .single();

  if (insertError) return;

  // 5. Notificações (Otimizado)
  await handleNotifications(
    eventType,
    galeria,
    newEvent,
    metadata,
    locationData,
  );
}

// Função auxiliar para limpar o switch do switch
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
 * 📊 Consolida os dados para a Página de BI
 */
export async function getGaleriaEventReport(galeriaId: string) {
  const supabase = await createSupabaseClientForCache();
  const { data, error } = await supabase
    .from('tb_galeria_stats')
    .select('*')
    .eq('galeria_id', galeriaId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const eventLabels: Record<string, string> = {
    view: 'Visualização',
    lead: 'Cadastro de Visitante',
    download: 'Download de Fotos',
    share: 'Compartilhamento',
  };

  const browserCounts: Record<string, number> = {};
  data.forEach((e) => {
    const b = e.device_info?.browser || 'Outros';
    browserCounts[b] = (browserCounts[b] || 0) + 1;
  });

  const topBrowsers = Object.entries(browserCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    rawEvents: data.map((e) => ({
      ...e,
      event_label: eventLabels[e.event_type] || e.event_type,
      location: e.metadata?.location || 'Não rastreado',
    })),
    topBrowsers,
  };
}
