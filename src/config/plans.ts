import { Zap, Star, Rocket, Crown } from 'lucide-react';
export const IS_PAYMENT_SIMULATED = true; // Altere para false para usar Stripe real

export const PLANS = {
  START: {
    id: 'prod_start',
    priceId: 'price_start_monthly',
    name: 'Start',
    price: 40,
    conceito: 'Essencial',
    maxGalleries: 5,
    features: ["Até 5 Galerias", "Link Padrão", "Download com Marca d'água", "Suporte via Ticket"],
    cta: 'Começar Agora',
    icon: Zap,
  },
  INTERMEDIATE: {
    id: 'prod_int',
    priceId: 'price_int_monthly',
    name: 'Intermediate',
    price: 60,
    conceito: 'Produtividade',
    maxGalleries: 15,
    features: ["Até 15 Galerias", "Link Padrão", "Download sem Marca d'água", "Analytics Básico"],
    cta: 'Evoluir Carreira',
    icon: Rocket,
  },
  PRO: {
    id: 'prod_pro',
    priceId: 'price_pro_monthly',
    name: 'Pro',
    price: 80,
    conceito: 'Elite Digital',
    maxGalleries: 30,
    features: ["Até 30 Galerias", "Subdomínio Próprio", "Analytics de Fotos", "WhatsApp VIP"],
    cta: 'Assinar Elite',
    icon: Star,
  },
  PREMIUM: {
    id: 'prod_premium',
    priceId: 'price_premium_monthly',
    name: 'Premium',
    price: 99,
    conceito: 'Luxo',
    maxGalleries: Infinity,
    features: ["Galerias Ilimitadas", "Subdomínio Próprio", "Analytics Completo", "Suporte VIP 24h"],
    cta: 'Experiência de Luxo',
    icon: Crown,
  }
} as const;

export type PlanKey = keyof typeof PLANS;