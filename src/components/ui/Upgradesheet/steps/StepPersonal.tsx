'use client';

import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Hash,
  Building2,
  Map,
} from 'lucide-react';
import { SheetSection } from '@/components/ui/Sheet';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { FieldLabel } from '../FieldLabel';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { formatCpfCnpj, formatCep, formatPhone } from '../utils';

export function StepPersonal() {
  const {
    personal,
    setPersonal,
    address,
    setAddress,
    profile,
    email,
    loadingPrefill,
    hasSavedBillingData,
    loadingCep,
    handleCepChange,
    handleCepBlur,
    numberInputRef,
    streetInputRef,
  } = useUpgradeSheetContext();

  const cpfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loadingPrefill) cpfInputRef.current?.focus();
  }, [loadingPrefill]);

  return (
    <SheetSection title="Dados cadastrais">
      <div className="space-y-4">
        {hasSavedBillingData && (
          <div className="flex items-center gap-1.5 px-1 pb-1">
            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            <p className="text-[9px] text-emerald-600 font-medium">
              Dados salvos do último cadastro. Você pode editá-los.
            </p>
          </div>
        )}

        <div className="grid gap-2" style={{ gridTemplateColumns: '30% 1fr' }}>
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={CreditCard} label="CPF ou CNPJ" required />
            {loadingPrefill ? (
              <div className="w-full h-9 bg-slate-200 rounded-[0.4rem] animate-pulse" />
            ) : (
              <input
                ref={cpfInputRef}
                type="text"
                inputMode="numeric"
                value={personal.cpfCnpj}
                onChange={(e) =>
                  setPersonal((p) => ({
                    ...p,
                    cpfCnpj: formatCpfCnpj(e.target.value),
                  }))
                }
                placeholder="000.000.000-00"
                className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
              />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={User} label="Nome Completo" required />
            <input
              type="text"
              value={personal.fullName}
              onChange={(e) =>
                setPersonal((p) => ({
                  ...p,
                  fullName: e.target.value.trimStart().replace(/\s+/g, ' '),
                }))
              }
              placeholder="Nome como na cobrança / NF-e"
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
            <p className="text-[8px] text-slate-400">
              Pode ser diferente do nome do seu perfil. Será usado na fatura e na NF-e.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={Mail} label="E-mail" />
            <div className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none flex items-center justify-between min-h-9">
              <span className="truncate">{profile?.email ?? email ?? '—'}</span>
              <CheckCircle2 size={10} className="text-emerald-400 shrink-0 ml-1" />
            </div>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <FieldLabel icon={Phone} label="WhatsApp" required />
              <InfoTooltip
                portal
                title="WhatsApp"
                content="Este é o mesmo número exibido no seu perfil público. Se você alterar aqui, a alteração será refletida no perfil. Também usamos este número para envio de comunicações sobre seu plano e cobrança."
              />
            </div>
            <input
              type="tel"
              value={personal.whatsapp}
              onChange={(e) =>
                setPersonal((p) => ({
                  ...p,
                  whatsapp: formatPhone(e.target.value),
                }))
              }
              placeholder="(11) 9 0000-0000"
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
        </div>

        <div
          className="border-t border-slate-200 pt-4 grid gap-2"
          style={{ gridTemplateColumns: '30% 1fr' }}
        >
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={MapPin} label="CEP" required />
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="numeric"
                value={address.cep}
                onChange={(e) => handleCepChange(formatCep(e.target.value))}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                maxLength={9}
                className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
              />
              {loadingCep && (
                <div className="absolute right-2 w-2.5 h-2.5 border-2 border-petroleum/20 border-t-petroleum rounded-full animate-spin" />
              )}
            </div>
          </div>
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={Home} label="Logradouro" required />
            <input
              ref={streetInputRef}
              type="text"
              value={address.street}
              onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
              onBlur={() => {
                if (address.street.trim()) numberInputRef.current?.focus();
              }}
              placeholder="Rua, Avenida, Travessa..."
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: '30% 30% 40%' }}>
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={Hash} label="Número" required />
            <input
              ref={numberInputRef}
              type="text"
              value={address.number}
              onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
              placeholder="123"
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={Building2} label="Complemento" />
            <input
              type="text"
              value={address.complement}
              onChange={(e) =>
                setAddress((a) => ({ ...a, complement: e.target.value }))
              }
              placeholder="Apto, Sala, Bloco..."
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={Map} label="Bairro" required />
            <input
              type="text"
              value={address.neighborhood}
              onChange={(e) =>
                setAddress((a) => ({ ...a, neighborhood: e.target.value }))
              }
              placeholder="Centro, Vila Mariana..."
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={Building2} label="Cidade" required />
            <input
              type="text"
              value={address.city}
              onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              placeholder="São Paulo"
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <FieldLabel icon={Map} label="Estado (UF)" required />
            <input
              type="text"
              value={address.state}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  state: e.target.value.toUpperCase().slice(0, 2),
                }))
              }
              placeholder="SP"
              maxLength={2}
              className="w-full px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none uppercase"
            />
          </div>
        </div>

        <p className="text-[10px] text-petroleum/90 italic px-0.5">
          * CPF/CNPJ e Endereço são utilizados para emissão da NF-e conforme
          legislação vigente.
        </p>
      </div>
    </SheetSection>
  );
}
