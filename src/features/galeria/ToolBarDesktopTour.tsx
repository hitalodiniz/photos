'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: 'layout' | 'tags' | 'favorites' | 'share' | 'download' | null;
  openDrawer?: 'layout' | 'tags' | 'info';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo à Galeria! 👋',
    description:
      'Vamos fazer um tour rápido pelos recursos disponíveis para você aproveitar melhor sua experiência.',
    target: null,
  },
  {
    id: 'layout',
    title: 'Personalize o Layout',
    description:
      'Ajuste o número de colunas do grid para ver as fotos do jeito que preferir!',
    target: 'layout',
    openDrawer: 'layout',
  },
  {
    id: 'tags',
    title: 'Filtre por Marcações',
    description:
      'Use as marcações para encontrar fotos específicas rapidamente. Você pode selecionar até 3 marcações ao mesmo tempo.',
    target: 'tags',
    openDrawer: 'tags',
  },
  {
    id: 'favorites',
    title: 'Marque suas Favoritas ❤️',
    description:
      'Selecione suas fotos favoritas e filtre para ver apenas elas. Perfeito para escolher as fotos que você quer baixar!',
    target: 'favorites',
  },
  {
    id: 'share',
    title: 'Compartilhe com Amigos',
    description:
      'Envie a galeria via WhatsApp ou copie o link para compartilhar com quem quiser.',
    target: 'share',
  },
  {
    id: 'download',
    title: 'Baixe suas Fotos',
    description:
      'Baixe todas as fotos em um arquivo ZIP ou clique em cada foto para baixar individualmente.',
    target: 'download',
  },
];

interface GaleriaTourProps {
  galeriaId: string;
  canUseFavorites: boolean;
  hasTags: boolean;
  canStartTour?: boolean;
  onOpenDrawer: (drawer: 'layout' | 'tags' | 'info' | null) => void;
}

export function GaleriaTour({
  galeriaId,
  canUseFavorites,
  hasTags,
  canStartTour = true,
  onOpenDrawer,
}: GaleriaTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const STORAGE_KEY = `galeria_tour_${galeriaId}`;

  // Filtra steps baseado nas features disponíveis
  const availableSteps = TOUR_STEPS.filter((step) => {
    if (step.id === 'favorites' && !canUseFavorites) return false;
    if (step.id === 'tags' && !hasTags) return false;
    return true;
  });

  const currentStepData = availableSteps[currentStep];
  const isLastStep = currentStep === availableSteps.length - 1;

  // Verifica se deve mostrar o tour
  useEffect(() => {
    if (!canStartTour) return;

    const checkTourStatus = () => {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const today = new Date().toDateString();

      // Se nunca mostrou OU foi mostrado em outro dia
      if (!lastShown || lastShown !== today) {
        // Aguarda 1 segundo para dar tempo da página carregar
        setTimeout(() => setIsOpen(true), 1000);
      }
    };

    checkTourStatus();
  }, [STORAGE_KEY, canStartTour]);

  // Abre gavetas conforme o step
  useEffect(() => {
    if (isOpen && currentStepData?.openDrawer) {
      onOpenDrawer(currentStepData.openDrawer);
    }
  }, [isOpen, currentStep, currentStepData, onOpenDrawer]);

  // Destaca visualmente o elemento alvo acima do backdrop.
  useEffect(() => {
    if (!isOpen || !currentStepData?.target) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(
        `[data-tour="${currentStepData.target}"]`,
      ) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      setTargetRect(el.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, currentStepData?.target]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsCompleting(true);
    setTimeout(() => {
      setIsOpen(false);
      onOpenDrawer(null);
      // Marca como visto hoje
      localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    }, 300);
  };

  const handleComplete = () => {
    setIsCompleting(true);
    setTimeout(() => {
      setIsOpen(false);
      onOpenDrawer(null);
      // Marca como visto hoje
      localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Fundo escuro: tela inteira no boas-vindas; com spotlight o recorte fica pelo box-shadow do highlight */}
      <div
        className={`absolute inset-0 z-[9999] animate-in fade-in duration-300 pointer-events-auto ${
          targetRect ? 'bg-transparent' : 'bg-black/50'
        }`}
        aria-hidden
      />

      {/* Highlight do alvo (acima do backdrop) */}
      {targetRect && (
        <div
          className="absolute z-[10000] rounded-lg ring-2 ring-gold shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none transition-all duration-200"
          style={{
            top: Math.max(0, targetRect.top - 6),
            left: Math.max(0, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tour Modal — centralizado */}
      <div
        className={`fixed left-0 right-0 bottom-8 z-[10001] flex items-center justify-center p-4 pointer-events-none ${
          isCompleting ? 'animate-out fade-out duration-300' : ''
        }`}
      >
        <div
          className={`pointer-events-auto w-full max-w-sm animate-in fade-in zoom-in-95 duration-300 ${
            isCompleting ? 'animate-out fade-out zoom-out-95' : ''
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-petroleum to-petroleum/90 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-[11px]">
                  {currentStep + 1}/{availableSteps.length}
                </div>
                <div>
                  <p className="text-white font-bold text-[11px] uppercase tracking-wide">
                    Tour da Galeria
                  </p>
                  <p className="text-white/70 text-[10px]">
                    Passo {currentStep + 1} de {availableSteps.length}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-100">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / availableSteps.length) * 100}%`,
                }}
              />
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-base font-bold text-petroleum mb-1.5">
                  {currentStepData.title}
                </h3>
                <p className="text-[13px] text-petroleum/80 leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {/* Visual Indicator */}
              {currentStepData.target && (
                <div className="bg-gold/10 border border-gold/30 rounded-md p-2.5 flex items-start gap-2.5">
                  <div className="shrink-0 w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center mt-0.5">
                    <span className="text-gold text-[10px] font-bold">!</span>
                  </div>
                  <p className="text-[11px] text-petroleum/70 leading-snug">
                    {currentStepData.openDrawer
                      ? 'A gaveta foi aberta automaticamente para você explorar.'
                      : 'Veja este recurso destacado na barra acima.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200">
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-petroleum text-[11px] font-semibold uppercase tracking-wide hover:bg-slate-50 transition-colors"
                  >
                    Anterior
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  className="px-3 py-1.5 rounded-md text-slate-500 text-[11px] font-semibold uppercase tracking-wide hover:text-slate-700 transition-colors"
                >
                  Pular Tour
                </button>
              </div>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-petroleum text-white text-[11px] font-semibold uppercase tracking-wide hover:bg-petroleum/90 transition-colors shadow-lg"
              >
                {isLastStep ? (
                  <>
                    <Check size={14} />
                    Concluir
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK AUXILIAR PARA GERENCIAR O TOUR
// ═══════════════════════════════════════════════════════════════════════════════

export function useGaleriaTour(galeriaId: string) {
  const resetTour = () => {
    const STORAGE_KEY = `galeria_tour_${galeriaId}`;
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasSeenTourToday = () => {
    const STORAGE_KEY = `galeria_tour_${galeriaId}`;
    const lastShown = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();
    return lastShown === today;
  };

  return { resetTour, hasSeenTourToday };
}
