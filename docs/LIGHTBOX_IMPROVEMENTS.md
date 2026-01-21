# Análise e Melhorias para Lightbox.tsx

## 🔴 Problemas Críticos Encontrados

### 1. **Importação Duplicada (Linha 2)**
```typescript
// ❌ ERRADO
import React, { useEffect, useState, useState } from 'react';

// ✅ CORRETO
import React, { useEffect, useState } from 'react';
```

### 2. **Sentry Não Importado (Linha 104)**
```typescript
// ❌ ERRADO - Sentry não está importado
Sentry.captureMessage(`Lightbox Fallback - ID: ${photoId}`, { level: 'info' });

// ✅ CORRETO - Adicionar import ou remover/comentar
// import * as Sentry from '@sentry/nextjs';
// OU comentar se não estiver usando Sentry
```

### 3. **Bug: src da Imagem Não Usa Fallback (Linha 253)**
```typescript
// ❌ ERRADO - Não usa imgSrc que tem o fallback implementado
<img
  key={`${photoId}-${usingProxy}`}
  src={getHighResImageUrl(currentPhoto.id)} // ❌ Ignora o fallback!
  onError={handleImageError}
/>

// ✅ CORRETO - Usar imgSrc que já tem o fallback
<img
  key={`${photoId}-${usingProxy}`}
  src={imgSrc} // ✅ Usa o estado que já tem fallback
  onError={handleImageError}
/>
```

### 4. **Inconsistência de Tamanhos de Imagem**
```typescript
// Linha 89: '2560'
const initialUrl = getDirectGoogleUrl(photoId, isMobile ? '1280' : '2560');

// Linha 94: '1920' (diferente!)
setImgSrc(getDirectGoogleUrl(photoId, isMobile ? '1280' : '1920'));

// Linha 101: '2560' (volta para 2560)
const fallbackUrl = getProxyUrl(photoId, isMobile ? '1280' : '2560');
```
**Problema**: Tamanhos inconsistentes podem causar confusão e bugs.

## 🟡 Melhorias de Código

### 5. **Usar Hook `useGoogleDriveImage` (Criado Recentemente)**
O código atual duplica a lógica de fallback que já existe no hook `useGoogleDriveImage`:

```typescript
// ❌ CÓDIGO ATUAL (Duplicado)
const [imgSrc, setImgSrc] = useState(initialUrl);
const [usingProxy, setUsingProxy] = useState(false);

useEffect(() => {
  setImgSrc(getDirectGoogleUrl(photoId, isMobile ? '1280' : '1920'));
  setUsingProxy(false);
  setIsImageLoading(true);
}, [activeIndex, photoId, isMobile]);

const handleImageError = () => {
  if (!usingProxy) {
    const fallbackUrl = getProxyUrl(photoId, isMobile ? '1280' : '2560');
    setImgSrc(fallbackUrl);
    setUsingProxy(true);
  }
};

// ✅ MELHORIA (Usar Hook)
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';

const {
  imgSrc,
  isLoading: isImageLoading,
  isLoaded,
  handleError,
  handleLoad,
} = useGoogleDriveImage({
  photoId: currentPhoto.id,
  width: isMobile ? '1280' : '2560',
  priority: true,
  fallbackToProxy: true,
});
```

**Benefícios**:
- Elimina ~20 linhas de código duplicado
- Lógica centralizada e testada
- Consistência com outros componentes

### 6. **Melhorar Preload de Imagens**
O preload atual só carrega a próxima foto. Poderia melhorar:

```typescript
// ❌ CÓDIGO ATUAL (Só próxima)
useEffect(() => {
  if (activeIndex + 1 < photos.length) {
    const nextId = photos[activeIndex + 1].id;
    const nextImg = new Image();
    nextImg.src = getDirectGoogleUrl(nextId, isMobile ? '1280' : '2560');
  }
}, [activeIndex, photos, isMobile]);

// ✅ MELHORIA (Próxima + Anterior)
useEffect(() => {
  // Preload próxima foto
  if (activeIndex + 1 < photos.length) {
    const nextId = photos[activeIndex + 1].id;
    const nextImg = new Image();
    nextImg.src = getDirectGoogleUrl(nextId, isMobile ? '1280' : '2560');
  }
  
  // Preload foto anterior
  if (activeIndex > 0) {
    const prevId = photos[activeIndex - 1].id;
    const prevImg = new Image();
    prevImg.src = getDirectGoogleUrl(prevId, isMobile ? '1280' : '2560');
  }
}, [activeIndex, photos, isMobile]);
```

### 7. **Extrair Lógica de Touch para Hook Customizado**
A lógica de swipe está duplicada e poderia ser um hook reutilizável:

```typescript
// ✅ CRIAR HOOK: useSwipe.ts
export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  minDistance = 50,
  disabled = false
) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (disabled || !touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minDistance) onSwipeRight();
    else if (distance < -minDistance) onSwipeLeft();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// ✅ USO NO LIGHTBOX
const swipeHandlers = useSwipe(onNext, onPrev, 50, isSingleView);
```

### 8. **Extrair Lógica de Interface Visibility**
A lógica de mostrar/ocultar interface poderia ser um hook:

```typescript
// ✅ CRIAR HOOK: useInterfaceVisibility.ts
export function useInterfaceVisibility(
  hideDelay = 3000,
  disabled = false
) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (disabled || typeof window === 'undefined' || window.innerWidth < 768) {
      setIsVisible(true);
      return;
    }

    let timer: NodeJS.Timeout;
    const handleActivity = () => {
      setIsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIsVisible(false), hideDelay);
    };

    window.addEventListener('mousemove', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      clearTimeout(timer);
    };
  }, [hideDelay, disabled]);

  return isVisible;
}
```

### 9. **Melhorar Dependências dos useEffects**
Alguns useEffects estão faltando dependências:

```typescript
// ❌ PROBLEMA: Falta dependências
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') onNext();
    if (e.key === 'ArrowLeft') onPrev();
  };
  // ...
}, [onClose, onNext, onPrev]); // ✅ OK, mas onClose/onNext/onPrev podem mudar

// ✅ MELHORIA: Usar useCallback nos handlers do componente pai
// OU usar refs para evitar re-renders desnecessários
```

### 10. **Formatação da Key Prop (Linha 253)**
```typescript
// ❌ ERRADO - Key em linha separada
<img
key={`${photoId}-${usingProxy}`} // Força re-render ao trocar para proxy
  src={getHighResImageUrl(currentPhoto.id)}
/>

// ✅ CORRETO
<img
  key={`${photoId}-${usingProxy}`}
  src={imgSrc}
/>
```

### 11. **Adicionar Tipagem Mais Específica**
```typescript
// ❌ ATUAL
interface Photo {
  id: string | number;
}

// ✅ MELHORIA
interface Photo {
  id: string | number;
  width?: number;
  height?: number;
  name?: string;
}
```

### 12. **Otimizar Re-renders com useMemo**
Alguns cálculos poderiam ser memoizados:

```typescript
// ✅ MELHORIA
const currentPhoto = useMemo(
  () => photos[activeIndex],
  [photos, activeIndex]
);

const isFavorited = useMemo(
  () => favorites.includes(String(currentPhoto?.id)),
  [favorites, currentPhoto?.id]
);

const interfaceVisibilityClass = useMemo(
  () =>
    'transition-all duration-700 ' +
    (showInterface
      ? 'opacity-100 translate-y-0 visible'
      : 'md:opacity-0 md:-translate-y-4 md:pointer-events-none md:invisible'),
  [showInterface]
);
```

## 📊 Resumo de Impacto

### Problemas Críticos (Devem ser corrigidos)
1. ✅ Importação duplicada de `useState`
2. ✅ Sentry não importado
3. ✅ Bug: `src` não usa `imgSrc` com fallback
4. ✅ Inconsistência de tamanhos de imagem

### Melhorias Recomendadas
5. ✅ Usar hook `useGoogleDriveImage` (elimina ~20 linhas)
6. ✅ Melhorar preload (próxima + anterior)
7. ✅ Extrair lógica de touch para hook
8. ✅ Extrair lógica de interface visibility
9. ✅ Melhorar dependências dos useEffects
10. ✅ Adicionar tipagem mais específica
11. ✅ Otimizar com useMemo

### Estimativa de Redução de Código
- **Antes**: ~300 linhas
- **Depois**: ~220 linhas (com hooks)
- **Redução**: ~80 linhas (-27%)

## 🎯 Prioridade de Implementação

### Alta Prioridade (Bugs)
1. Corrigir importação duplicada
2. Corrigir bug do `src` da imagem
3. Corrigir Sentry ou remover
4. Padronizar tamanhos de imagem

### Média Prioridade (Melhorias)
5. Usar hook `useGoogleDriveImage`
6. Melhorar preload
7. Extrair hooks customizados

### Baixa Prioridade (Otimizações)
8. Adicionar useMemo
9. Melhorar tipagem
10. Otimizar dependências
