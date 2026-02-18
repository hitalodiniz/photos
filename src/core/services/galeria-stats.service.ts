'use server';

import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { headers } from 'next/headers';
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
  if (!ip || ip === 'unknown' || ip.includes('127.0.0.1')) return null;
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    if (data.error) return null;
    return {
      city: data.city,
      region: data.region_code,
      country: data.country_code,
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
  visitorId,
  metadata = {},
}: GaleriaEventPayload) {
  const supabase = await createSupabaseClientForCache();
  const headerList = await headers();
  const ua = headerList.get('user-agent') || '';
  const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  const parser = new UAParser(ua);
  const deviceInfo = {
    os: parser.getOS().name || 'Desconhecido',
    browser: parser.getBrowser().name || 'Desconhecido',
    type: parser.getDevice().type || 'desktop',
  };

  const locationData = await getIPLocation(ip);
  const locationStr = locationData
    ? `${locationData.city}, ${locationData.region}`
    : 'Não rastreado';

  const finalMetadata = {
    ...metadata,
    location: locationStr,
  };

  const trackId = visitorId || ip;

  // Trava de 1 hora para visualizações repetidas do mesmo IP/Visitante
  if (eventType === 'view') {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('tb_galeria_stats')
      .select('id')
      .eq('galeria_id', galeria.id)
      .eq('event_type', 'view')
      .eq('visitor_id', trackId)
      .gt('created_at', oneHourAgo)
      .limit(1);

    if (recent && recent.length > 0) return;
  }

  // Inserção no Banco de Estatísticas
  const { data: newEvent, error: insertError } = await supabase
    .from('tb_galeria_stats')
    .insert([
      {
        galeria_id: galeria.id,
        event_type: eventType,
        visitor_id: trackId,
        device_info: deviceInfo,
        metadata: finalMetadata,
      },
    ])
    .select()
    .single();

  if (insertError) return;

  // Lógica de Notificação
  const userId = galeria.user_id || galeria.photographer_id;
  if (!userId) return;

  const eventLabels: Record<string, string> = {
    view: 'Visualização',
    lead: 'Cadastro de Visitante',
    download: 'Download de Fotos',
    share: 'Compartilhamento',
  };

  // Objeto preparado para o "Ver Detalhes" do BI
  const eventDataForBI = {
    ...newEvent,
    event_label: eventLabels[eventType],
    location: locationStr,
  };

  switch (eventType) {
    case 'view':
      if (!galeria.leads_enabled) {
        await createInternalNotification({
          userId,
          title: '👀 Novo Acesso',
          message: `Sua galeria "${galeria.title}" está sendo visualizada agora.`,
          type: 'info',
          link: `/dashboard/galerias/${galeria.id}/stats`,
          eventData: eventDataForBI, // ✅ Vínculo com BI
        });
      }
      break;

    case 'lead':
      await createInternalNotification({
        userId,
        title: '👤 Visitante Identificado',
        message: `${metadata.nome || 'Um visitante'} entrou na galeria "${galeria.title}".`,
        type: 'success',
        link: `/dashboard/galerias/${galeria.id}/leads`,
        eventData: eventDataForBI, // ✅ Vínculo com BI
      });
      break;

    case 'download':
      await createInternalNotification({
        userId,
        title: '📥 Download Realizado',
        message: `Fotos baixadas na galeria "${galeria.title}".`,
        type: 'info',
        link: `/dashboard/galerias/${galeria.id}/stats`,
        eventData: eventDataForBI, // ✅ Vínculo com BI
      });
      break;

    case 'share':
      await createInternalNotification({
        userId,
        title: '📤 Compartilhamento',
        message: `Fotos compartilhadas na galeria "${galeria.title}".`,
        type: 'info',
        link: `/dashboard/galerias/${galeria.id}/stats`,
        eventData: eventDataForBI, // ✅ Vínculo com BI
      });
      break;
  }
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
