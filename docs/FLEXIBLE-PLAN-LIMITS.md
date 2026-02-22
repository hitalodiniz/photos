# 🎯 Estratégias de Limites Flexíveis para Planos SaaS

## 📊 Problema Identificado

**Rigidez dos limites atuais:**
- PRO: 50 galerias × 600 fotos = 30.000 fotos totais
- Fotógrafo A: 100 ensaios × 50 fotos = 5.000 fotos (bloqueado por limite de galerias)
- Fotógrafo B: 20 casamentos × 1.200 fotos = 24.000 fotos (bloqueado por limite de fotos/galeria)

**Problema:** Ambos precisam de upgrade desnecessário!

---

## ✅ SOLUÇÃO 1: Pool de Recursos (RECOMENDADO)

### Conceito: Cota Total + Limites Suaves

Em vez de limites rígidos, use **créditos totais** com limites suaves por galeria.

```typescript
// core/config/plans.ts

export interface PlanPermissions {
  // ✅ NOVO: Cota total
  totalPhotosPool: number; // Pool total de fotos
  maxGalleries: number; // Limite de galerias
  
  // ✅ LIMITES SUAVES (recomendações, não bloqueios)
  recommendedPhotosPerGallery: number; // Sugestão
  maxPhotosPerGallery: number; // Máximo absoluto (evita abuso)
  
  // ... resto das permissões
}

export const PERMISSIONS_BY_PLAN: Record<PlanKey, PlanPermissions> = {
  FREE: {
    totalPhotosPool: 160, // 2 galerias × 80 fotos
    maxGalleries: 2,
    recommendedPhotosPerGallery: 80,
    maxPhotosPerGallery: 160, // Pode usar todo o pool em 1 galeria se quiser
    // ...
  },
  START: {
    totalPhotosPool: 2000, // 10 × 200 = 2000
    maxGalleries: 10,
    recommendedPhotosPerGallery: 200,
    maxPhotosPerGallery: 500, // Limite de segurança (2.5× média)
    // ...
  },
  PLUS: {
    totalPhotosPool: 8000, // 20 × 400 = 8000
    maxGalleries: 20,
    recommendedPhotosPerGallery: 400,
    maxPhotosPerGallery: 1000,
    // ...
  },
  PRO: {
    totalPhotosPool: 30000, // 50 × 600 = 30000
    maxGalleries: 50,
    recommendedPhotosPerGallery: 600,
    maxPhotosPerGallery: 2000, // Permite festas grandes
    // ...
  },
  PREMIUM: {
    totalPhotosPool: 999999, // "Ilimitado"
    maxGalleries: 9999,
    recommendedPhotosPerGallery: 1000,
    maxPhotosPerGallery: 5000,
    // ...
  },
};
```

### Lógica de Validação

```typescript
// core/utils/plan-validation.ts

interface GalleryUsage {
  totalPhotosUsed: number;
  totalGalleriesUsed: number;
  photosInThisGallery: number;
}

export function canAddPhotos(
  planKey: PlanKey,
  usage: GalleryUsage,
  photosToAdd: number
): { allowed: boolean; reason?: string } {
  const plan = PERMISSIONS_BY_PLAN[planKey];
  
  // 1️⃣ Verifica limite de galerias
  if (usage.totalGalleriesUsed >= plan.maxGalleries) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de ${plan.maxGalleries} galerias do plano ${planKey}`,
    };
  }
  
  // 2️⃣ Verifica pool total (limite principal)
  if (usage.totalPhotosUsed + photosToAdd > plan.totalPhotosPool) {
    const remaining = plan.totalPhotosPool - usage.totalPhotosUsed;
    return {
      allowed: false,
      reason: `Você atingiu o limite de ${plan.totalPhotosPool} fotos. Restam ${remaining} fotos disponíveis.`,
    };
  }
  
  // 3️⃣ Verifica limite por galeria (soft warning)
  const newTotal = usage.photosInThisGallery + photosToAdd;
  if (newTotal > plan.maxPhotosPerGallery) {
    return {
      allowed: false,
      reason: `Esta galeria atingiria ${newTotal} fotos, mas o limite máximo é ${plan.maxPhotosPerGallery} por galeria.`,
    };
  }
  
  return { allowed: true };
}

export function getUsageStats(planKey: PlanKey, usage: GalleryUsage) {
  const plan = PERMISSIONS_BY_PLAN[planKey];
  
  return {
    // Pool de fotos
    photosUsed: usage.totalPhotosUsed,
    photosTotal: plan.totalPhotosPool,
    photosPercent: (usage.totalPhotosUsed / plan.totalPhotosPool) * 100,
    photosRemaining: plan.totalPhotosPool - usage.totalPhotosUsed,
    
    // Galerias
    galleriesUsed: usage.totalGalleriesUsed,
    galleriesTotal: plan.maxGalleries,
    galleriesPercent: (usage.totalGalleriesUsed / plan.maxGalleries) * 100,
    galleriesRemaining: plan.maxGalleries - usage.totalGalleriesUsed,
    
    // Média
    avgPhotosPerGallery: Math.round(usage.totalPhotosUsed / usage.totalGalleriesUsed),
    recommendedPhotos: plan.recommendedPhotosPerGallery,
  };
}
```

### UI de Uso

```tsx
// components/UsageIndicator.tsx
export function UsageIndicator({ planKey, usage }: Props) {
  const stats = getUsageStats(planKey, usage);
  
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* Pool de Fotos */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Fotos Totais</span>
          <span className="font-semibold">
            {stats.photosUsed.toLocaleString()} / {stats.photosTotal.toLocaleString()}
          </span>
        </div>
        <Progress value={stats.photosPercent} />
        <p className="text-xs text-gray-500 mt-1">
          {stats.photosRemaining.toLocaleString()} fotos disponíveis
        </p>
      </div>
      
      {/* Galerias */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Galerias Ativas</span>
          <span className="font-semibold">
            {stats.galleriesUsed} / {stats.galleriesTotal}
          </span>
        </div>
        <Progress value={stats.galleriesPercent} />
      </div>
      
      {/* Dica */}
      {stats.avgPhotosPerGallery > stats.recommendedPhotos && (
        <div className="bg-blue-50 p-3 rounded text-sm">
          💡 <strong>Dica:</strong> Você está usando uma média de{' '}
          {stats.avgPhotosPerGallery} fotos por galeria. 
          Considere dividir galerias grandes para melhor organização.
        </div>
      )}
    </div>
  );
}
```

---

## ✅ SOLUÇÃO 2: Limites Flexíveis com Warnings

Permite ultrapassar limites com avisos progressivos.

```typescript
// core/utils/flexible-limits.ts

type LimitStatus = 'safe' | 'warning' | 'critical' | 'blocked';

export function checkPhotoLimit(
  planKey: PlanKey,
  photosInGallery: number,
  totalPhotosUsed: number
): {
  status: LimitStatus;
  message: string;
  canUpload: boolean;
} {
  const plan = PERMISSIONS_BY_PLAN[planKey];
  const recommended = plan.recommendedPhotosPerGallery;
  const max = plan.maxPhotosPerGallery;
  const pool = plan.totalPhotosPool;
  
  // 🔴 Bloqueado: Pool esgotado
  if (totalPhotosUsed >= pool) {
    return {
      status: 'blocked',
      message: `Você esgotou suas ${pool.toLocaleString()} fotos. Faça upgrade!`,
      canUpload: false,
    };
  }
  
  // 🔴 Bloqueado: Limite máximo da galeria
  if (photosInGallery >= max) {
    return {
      status: 'blocked',
      message: `Esta galeria atingiu o limite de ${max} fotos.`,
      canUpload: false,
    };
  }
  
  // 🟠 Crítico: Acima de 90% do pool
  if (totalPhotosUsed / pool > 0.9) {
    const remaining = pool - totalPhotosUsed;
    return {
      status: 'critical',
      message: `Atenção! Restam apenas ${remaining} fotos no seu plano.`,
      canUpload: true,
    };
  }
  
  // 🟡 Aviso: Acima da recomendação por galeria
  if (photosInGallery > recommended) {
    return {
      status: 'warning',
      message: `Esta galeria tem ${photosInGallery} fotos (recomendado: ${recommended}). Considere dividir.`,
      canUpload: true,
    };
  }
  
  // ✅ Tudo certo
  return {
    status: 'safe',
    message: 'Você pode fazer upload normalmente.',
    canUpload: true,
  };
}
```

### UI com Warnings

```tsx
// components/UploadWarning.tsx
export function UploadWarning({ planKey, photosInGallery, totalPhotosUsed }: Props) {
  const limit = checkPhotoLimit(planKey, photosInGallery, totalPhotosUsed);
  
  if (limit.status === 'safe') return null;
  
  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    critical: 'bg-orange-50 border-orange-200 text-orange-800',
    blocked: 'bg-red-50 border-red-200 text-red-800',
  };
  
  return (
    <Alert className={colors[limit.status]}>
      {limit.status === 'warning' && '⚠️'}
      {limit.status === 'critical' && '🚨'}
      {limit.status === 'blocked' && '🚫'}
      {limit.message}
      
      {limit.status === 'blocked' && (
        <Button className="mt-2" onClick={handleUpgrade}>
          Fazer Upgrade
        </Button>
      )}
    </Alert>
  );
}
```

---

## ✅ SOLUÇÃO 3: Pacotes de Add-ons

Permite comprar capacidade extra sem mudar de plano.

```typescript
// core/config/addons.ts

export interface Addon {
  id: string;
  name: string;
  price: number;
  benefit: {
    type: 'photos' | 'galleries';
    amount: number;
  };
}

export const AVAILABLE_ADDONS: Addon[] = [
  {
    id: 'photos-1k',
    name: 'Pacote +1.000 Fotos',
    price: 9,
    benefit: { type: 'photos', amount: 1000 },
  },
  {
    id: 'photos-5k',
    name: 'Pacote +5.000 Fotos',
    price: 39,
    benefit: { type: 'photos', amount: 5000 },
  },
  {
    id: 'galleries-10',
    name: 'Pacote +10 Galerias',
    price: 19,
    benefit: { type: 'galleries', amount: 10 },
  },
];

export function calculatePlanCapacity(
  planKey: PlanKey,
  addons: string[]
): PlanPermissions {
  const basePlan = { ...PERMISSIONS_BY_PLAN[planKey] };
  
  addons.forEach(addonId => {
    const addon = AVAILABLE_ADDONS.find(a => a.id === addonId);
    if (!addon) return;
    
    if (addon.benefit.type === 'photos') {
      basePlan.totalPhotosPool += addon.benefit.amount;
    } else if (addon.benefit.type === 'galleries') {
      basePlan.maxGalleries += addon.benefit.amount;
    }
  });
  
  return basePlan;
}
```

---

## ✅ SOLUÇÃO 4: Limites por Tipo de Galeria

Diferentes limites para diferentes usos.

```typescript
export type GalleryType = 'ensaio' | 'casamento' | 'evento' | 'produto';

export const GALLERY_TYPE_LIMITS: Record<GalleryType, {
  recommendedPhotos: number;
  maxPhotos: number;
}> = {
  ensaio: {
    recommendedPhotos: 50,
    maxPhotos: 100,
  },
  casamento: {
    recommendedPhotos: 800,
    maxPhotos: 2000,
  },
  evento: {
    recommendedPhotos: 500,
    maxPhotos: 1500,
  },
  produto: {
    recommendedPhotos: 30,
    maxPhotos: 50,
  },
};

export function getGalleryLimit(
  planKey: PlanKey,
  galleryType: GalleryType
): number {
  const plan = PERMISSIONS_BY_PLAN[planKey];
  const typeLimit = GALLERY_TYPE_LIMITS[galleryType];
  
  // Usa o menor entre o limite do tipo e do plano
  return Math.min(typeLimit.maxPhotos, plan.maxPhotosPerGallery);
}
```

---

## 📊 Comparação de Soluções

| Solução | Flexibilidade | Complexidade | UX | Monetização |
|---------|---------------|--------------|-----|-------------|
| **Pool de Recursos** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Limites Flexíveis** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Add-ons** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Limites por Tipo** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

---

## 🎯 RECOMENDAÇÃO FINAL

**Combine Solução 1 + Solução 2:**

```typescript
export interface PlanPermissions {
  // Pool total (limite principal)
  totalPhotosPool: number;
  maxGalleries: number;
  
  // Limites por galeria (soft)
  recommendedPhotosPerGallery: number;
  maxPhotosPerGallery: number; // Hard limit (2-3× recommended)
  
  // ... outras permissions
}

// Exemplo PRO
PRO: {
  totalPhotosPool: 30000, // 30k fotos totais
  maxGalleries: 50,
  recommendedPhotosPerGallery: 600, // Sugestão
  maxPhotosPerGallery: 1500, // Permite festas grandes (2.5× média)
}
```

**Vantagens:**
1. ✅ Fotógrafo A: 100 ensaios × 50 fotos = 5.000 fotos ✅ OK
2. ✅ Fotógrafo B: 20 casamentos × 1.200 fotos = 24.000 fotos ✅ OK
3. ✅ Flexível mas evita abuso
4. ✅ UX clara (pool + warnings)
5. ✅ Fácil de comunicar ao cliente

---

## 📝 Mensagens de UI Sugeridas

**Dashboard:**
```
📊 Uso do Plano PRO
━━━━━━━━━━━━━━━━━━━━━━━
Fotos: 24.350 / 30.000 (81%)
Galerias: 22 / 50

💡 Você tem 5.650 fotos disponíveis
```

**Ao fazer upload:**
```
✅ Upload permitido
Esta galeria terá 1.245 fotos (recomendado: 600)
Restam 4.405 fotos no seu plano
```

**Quando estourar:**
```
🚫 Limite atingido
Você usou 30.000 / 30.000 fotos do plano PRO

Opções:
• Excluir fotos antigas
• Upgrade para PREMIUM (até 999k fotos)
• Comprar pacote +5.000 fotos (+R$ 39/mês)
```

---

## 🔧 Implementação Sugerida

1. **Fase 1:** Adicionar `totalPhotosPool` aos planos
2. **Fase 2:** Criar sistema de validação com pool
3. **Fase 3:** Atualizar UI de uso (dashboard)
4. **Fase 4:** Implementar warnings progressivos
5. **Fase 5 (futuro):** Add-ons para capacidade extra

**Quer que eu implemente o código completo?** 🚀
