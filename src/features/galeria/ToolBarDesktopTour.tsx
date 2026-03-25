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
  onOpenDrawer: (drawer: 'layout' | 'tags' | 'info' | null) => void;
}

export function GaleriaTour({
  galeriaId,
  canUseFavorites,
  hasTags,
  onOpenDrawer,
}: GaleriaTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

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
  }, [STORAGE_KEY]);

  // Abre gavetas conforme o step
  useEffect(() => {
    if (isOpen && currentStepData?.openDrawer) {
      onOpenDrawer(currentStepData.openDrawer);
    }
  }, [isOpen, currentStep, currentStepData, onOpenDrawer]);

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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-in fade-in duration-300" />

      {/* Tour Modal */}
      <div
        className={`fixed bottom-6 right-6 z-[9999] w-full max-w-md animate-in slide-in-from-bottom duration-300 ${
          isCompleting ? 'animate-out slide-out-to-bottom' : ''
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-petroleum to-petroleum/90 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {currentStep + 1}/{availableSteps.length}
              </div>
              <div>
                <p className="text-white font-bold text-sm uppercase tracking-wide">
                  Tour da Galeria
                </p>
                <p className="text-white/70 text-xs">
                  Passo {currentStep + 1} de {availableSteps.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
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
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-petroleum mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-petroleum/80 leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Visual Indicator */}
            {currentStepData.target && (
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center mt-0.5">
                  <span className="text-gold text-xs font-bold">!</span>
                </div>
                <p className="text-xs text-petroleum/70 leading-snug">
                  {currentStepData.openDrawer
                    ? 'A gaveta foi aberta automaticamente para você explorar.'
                    : 'Veja este recurso destacado na barra acima.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-petroleum text-sm font-semibold uppercase tracking-wide hover:bg-slate-50 transition-colors"
                >
                  Anterior
                </button>
              )}
              <button
                onClick={handleSkip}
                className="px-4 py-2 rounded-lg text-slate-500 text-sm font-semibold uppercase tracking-wide hover:text-slate-700 transition-colors"
              >
                Pular Tour
              </button>
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-petroleum text-white text-sm font-semibold uppercase tracking-wide hover:bg-petroleum/90 transition-colors shadow-lg"
            >
              {isLastStep ? (
                <>
                  <Check size={16} />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
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
