'use client';

import { useState, useTransition } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  MapPin,
  User,
  Image,
  Crown,
  ChessKnightIcon,
  Check,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import type { Galeria } from '@/core/types/galeria';
import { acknowledgeDowngradeAlert } from '@/actions/downgrade.actions';
import { getGalleryTypeLabel } from '@/components/ui/GalleryTypeToggle';
import { UpgradeSheet } from '@/components/ui/Upgradesheet';
import { getNextPlanKey, type PlanKey } from '@/core/config/plans';

interface DowngradeAlertProps {
  profile: {
    id: string;
    full_name: string;
    plan_key?: PlanKey | null;
    is_trial?: boolean | null;
    plan_trial_expires?: string | null;
    metadata?: {
      last_downgrade_alert_viewed?: boolean;
      downgrade_reason?: string | null;
      downgrade_at?: string | null;
    } | null;
  } | null;
  galerias: Galeria[];
}

function inferDowngradeTypeLabel(reason?: string | null) {
  const r = (reason ?? '').toLowerCase();
  if (!r) return 'Downgrade automático';

  if (
    r.includes('trial') ||
    r.includes('período de teste') ||
    r.includes('teste')
  )
    return 'Fim do trial';

  if (
    r.includes('pendant_change') ||
    r.includes('mudança agendada') ||
    r.includes('pending_change') ||
    r.includes('agendada')
  )
    return 'Downgrade agendado';

  if (
    r.includes('pagamento em atraso') ||
    r.includes('overdue') ||
    r.includes('carência') ||
    r.includes('inadimpl')
  )
    return 'Downgrade por atraso';

  if (
    r.includes('período pago encerrado') ||
    r.includes('pagamento encerrado') ||
    r.includes('expirou')
  )
    return 'Fim do período pago';

  if (r.includes('arrependimento') || r.includes('direito de arrependimento'))
    return 'Cancelamento com arrependimento';

  if (r.includes('cancelamento')) return 'Cancelamento de assinatura';
  if (r.includes('limite') || r.includes('quota') || r.includes('cota'))
    return 'Adequação de limite';

  return 'Downgrade automático';
}

export function DowngradeAlert({ profile, galerias }: DowngradeAlertProps) {
  const [isPending, startTransition] = useTransition();
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!profile) return null;

  const metadata = profile.metadata as
    | {
        last_downgrade_alert_viewed?: boolean;
        downgrade_reason?: string | null;
        downgrade_at?: string | null;
      }
    | null
    | undefined;
  const shouldShow = metadata?.last_downgrade_alert_viewed === false;
  const showSignatureExpiredBanner = shouldShow;

  const downgradeTypeLabel = inferDowngradeTypeLabel(
    metadata?.downgrade_reason,
  );

  const autoArchived = galerias.filter(
    (g) =>
      g.auto_archived === true &&
      g.is_archived === false &&
      g.is_deleted === false,
  );

  const shouldRenderAlert = shouldShow && !dismissed;

  const total = autoArchived.length;
  const currentPlanKey = (profile.plan_key as PlanKey | undefined) ?? 'FREE';
  const suggestedPlan = getNextPlanKey(currentPlanKey) ?? 'PRO';

  // 🎯 Calcula total de fotos afetadas
  const totalPhotos = autoArchived.reduce(
    (sum, g) => sum + (g.photo_count || 0),
    0,
  );

  const handleConfirm = () => {
    startTransition(async () => {
      await acknowledgeDowngradeAlert();
    });
  };

  const handleDismissAlert = () => {
    setDismissed(true);
    handleConfirm();
  };

  const handleSubscribe = () => {
    setUpgradeSheetOpen(true);
    handleDismissAlert();
  };

  return (
    <>
      {shouldRenderAlert && (
        <BaseModal
          isOpen
          onClose={handleDismissAlert}
          title="Adequação de Plano"
          subtitle="Ajuste automático por mudança de assinatura"
          maxWidth="3xl"
          headerIcon={<AlertTriangle size={18} />}
          showCloseButton={!isPending}
          footer={
            <div className="flex items-center justify-between w-full">
              <p className="text-[10px] text-slate-100 italic">
                Este aviso é exibido apenas uma vez após um downgrade
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismissAlert}
                  disabled={isPending}
                  className="btn-secondary-white"
                >
                  <Check size={16} />
                  Manter plano Free
                </button>
                <button
                  type="button"
                  onClick={handleSubscribe}
                  className="btn-luxury-primary"
                >
                  <Crown size={16} />
                  Assinar plano
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {(showSignatureExpiredBanner || total === 0) && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                <p className="text-[13px] font-semibold text-rose-900 mb-1">
                  O período da sua assinatura expirou.
                </p>
                <p className="text-[11px] text-rose-700 leading-relaxed mt-2">
                  Tipo de downgrade: <strong>{downgradeTypeLabel}</strong>
                </p>
                <p className="text-[12px] text-rose-700 leading-relaxed">
                  Para manter os recursos do plano expirado, assine o plano
                  novamente.
                </p>
              </div>
            )}

            {/* 🎯 Resumo em destaque */}
            {total > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Archive size={18} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-amber-900 mb-1">
                      {total} galeria{total > 1 ? 's' : ''} arquivada
                      {total > 1 ? 's' : ''} automaticamente
                    </p>
                    <p className="text-[12px] text-amber-700 leading-relaxed">
                      Sua assinatura foi alterada e estas galerias foram movidas
                      para a seção <strong>"Arquivadas"</strong> para se adequar
                      ao novo limite do plano atual.
                    </p>
                  </div>
                </div>

                {/* 🎯 Estatísticas */}
                <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Archive size={12} className="text-amber-600" />
                    <span className="text-amber-800">
                      <strong>{total}</strong>{' '}
                      {total === 1 ? 'galeria' : 'galerias'}
                    </span>
                  </div>
                  {totalPhotos > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Image size={12} className="text-amber-600" />
                      <span className="text-amber-800">
                        <strong>{totalPhotos.toLocaleString('pt-BR')}</strong>{' '}
                        fotos
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🎯 Lista aprimorada de galerias */}
            {total > 0 && (
              <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                {/* Header da lista */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Galerias Afetadas ({total})
                  </p>
                </div>

                {/* Lista com scroll */}
                <div className="max-h-44 overflow-y-auto">
                  <div className="divide-y divide-slate-100">
                    {autoArchived.map((g, index) => (
                      <div
                        key={g.id}
                        className="p-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Número da galeria */}
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-500">
                              {index + 1}
                            </span>
                          </div>

                          {/* Conteúdo principal */}
                          <div className="flex-1 min-w-0">
                            {/* Título da galeria */}
                            <h4
                              className="text-[13px] font-semibold text-petroleum mb-1 truncate"
                              title={g.title}
                            >
                              {g.title}
                            </h4>

                            {/* Metadados em linha única */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                              {/* Cliente/Tipo */}
                              {(g.client_name || g.has_contracting_client) && (
                                <div className="flex items-center gap-1">
                                  <User
                                    size={11}
                                    className="text-gold flex-shrink-0"
                                  />
                                  <span className="truncate max-w-[150px]">
                                    {g.client_name ||
                                      getGalleryTypeLabel(
                                        g.has_contracting_client,
                                      )}
                                  </span>
                                </div>
                              )}

                              {/* Local */}
                              {g.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin
                                    size={11}
                                    className="text-gold flex-shrink-0"
                                  />
                                  <span className="truncate max-w-[120px]">
                                    {g.location}
                                  </span>
                                </div>
                              )}

                              {/* Data */}
                              {g.date && (
                                <div className="flex items-center gap-1">
                                  <Calendar
                                    size={11}
                                    className="text-gold flex-shrink-0"
                                  />
                                  <span>
                                    {new Date(g.date).toLocaleDateString(
                                      'pt-BR',
                                    )}
                                  </span>
                                </div>
                              )}

                              {/* Fotos */}
                              {g.photo_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <Image
                                    size={11}
                                    className="text-slate-400 flex-shrink-0"
                                  />
                                  <span className="text-slate-500">
                                    {g.photo_count}{' '}
                                    {g.photo_count === 1 ? 'foto' : 'fotos'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 🎯 Instrução de como reativar */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-[11px] text-blue-800 leading-relaxed">
                {total > 0 ? (
                  <>
                    <strong>💡 Como reativar:</strong> Para tornar estas
                    galerias publicas novamente, faca upgrade do seu plano ou
                    desative outras galerias ativas primeiro. Acesse{' '}
                    <strong>Menu → Arquivadas</strong> para gerencia-las.
                  </>
                ) : (
                  <>
                    <strong>💡 Proximo passo:</strong> Assine um plano para
                    manter os recursos avancados e evitar limitacoes apos o
                    encerramento do trial.
                  </>
                )}
              </p>
            </div>
          </div>
        </BaseModal>
      )}
      <UpgradeSheet
        isOpen={upgradeSheetOpen}
        onClose={() => setUpgradeSheetOpen(false)}
        initialPlanKey={suggestedPlan}
      />
    </>
  );
}
