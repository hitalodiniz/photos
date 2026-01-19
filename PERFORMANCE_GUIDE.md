# Guia de Performance e Resoluções

Este documento define as **resoluções recomendadas** para cada contexto de uso no projeto, garantindo qualidade visual e performance otimizada, respeitando o limite de **2MB por arquivo**.

---

## 📐 Tabela de Resoluções Recomendadas

| Local de Uso | Resolução Recomendada | Por que este tamanho? |
|--------------|----------------------|----------------------|
| **Grid (Miniaturas)** | 500px a 600px | Ideal para colunas duplas ou triplas. Garante que o grid carregue instantaneamente. |
| **Lightbox (Mobile)** | 1280px (720p+) | Em telas de 6 polegadas, isso é mais que suficiente para nitidez total (Retina). |
| **Lightbox (Desktop)** | 1920px (Full HD) | O padrão da indústria. Cobre 90% dos monitores com qualidade cristalina. |
| **Lightbox (Monitores 4K)** | 2560px (2K) | O teto máximo. Acima disso, o arquivo dobra de peso e o ganho visual é imperceptível. |
| **Capa (Hero)** | 1920px | Equilíbrio entre impacto visual e velocidade de carregamento (LCP). |
| **Download Individual** | 1920px (direto)<br>2560px (proxy) | Garante arquivo abaixo de 2MB. Alta qualidade sem exceder limite. |

---

## 🎯 Estratégia de Limite de 2MB

### Princípios Fundamentais

1. **Requisições ao Google Drive**: Todas as requisições são feitas com resoluções que **garantem arquivos abaixo de 2MB**
2. **Sem verificação no cliente**: Não há verificação de tamanho no cliente (economiza banda Vercel)
3. **Otimização automática**: O Google processa e otimiza automaticamente os arquivos

### Como Funciona

- **Download Direto**: Usa `getDirectGoogleUrl(photoId, '1920')` → geralmente resulta em ~800KB-1.5MB
- **Download via Proxy**: Usa `/api/galeria/download/${photoId}` com 2560px → geralmente resulta em ~1MB-1.8MB
- **Fallback Automático**: Se direto falhar (CORS/429), automaticamente usa proxy

---

## 📊 Resoluções por Contexto de Uso

### 1. Dashboard (GaleriaCard)
- **Resolução**: 600px
- **Objetivo**: Rapidez no carregamento da lista administrativa
- **Tamanho estimado**: ~50-80KB

### 2. PhotoGrid (Miniaturas)
- **Resolução**: 500px
- **Objetivo**: Redução drástica de banda para galerias com muitas fotos
- **Tamanho estimado**: ~40-60KB

### 3. Lightbox (Mobile)
- **Resolução**: 1280px
- **Objetivo**: Nitidez Retina em telas móveis
- **Tamanho estimado**: ~300-500KB

### 4. Lightbox (Desktop)
- **Resolução**: 1920px
- **Objetivo**: Full HD padrão, cobre 90% dos monitores
- **Tamanho estimado**: ~800KB-1.5MB

### 5. Lightbox (Monitores 4K)
- **Resolução**: 2560px
- **Objetivo**: Máxima qualidade para monitores profissionais
- **Tamanho estimado**: ~1MB-1.8MB

### 6. Capa/Banner
- **Resolução**: 1920px
- **Objetivo**: LCP otimizado (Largest Contentful Paint)
- **Tamanho estimado**: ~800KB-1.5MB

### 7. Download (Direto)
- **Resolução**: 1920px
- **Objetivo**: Garante arquivo < 2MB, bypass Vercel
- **Tamanho estimado**: ~800KB-1.5MB

### 8. Download (Proxy)
- **Resolução**: 2560px
- **Objetivo**: Garante arquivo < 2MB, via API Vercel
- **Tamanho estimado**: ~1MB-1.8MB

### 9. Página de Senha
- **Resolução**: 1000px
- **Objetivo**: Carregamento imediato da tela de bloqueio (LCP)
- **Tamanho estimado**: ~200-400KB

### 10. Metadata (OpenGraph)
- **Resolução**: 1200px
- **Objetivo**: Compatibilidade e nitidez para compartilhamento social
- **Tamanho estimado**: ~400-700KB

---

## 🔧 Implementação Técnica

### Funções Disponíveis

Todas as funções estão em `src/core/utils/url-helper.ts`:

- `getDirectGoogleUrl(photoId, width)` - URL direta do Google (bypass Vercel)
- `getProxyUrl(photoId, width)` - URL via API proxy (usa banda Vercel)
- `getInternalGoogleDriveUrl(photoId, width, format)` - URL interna server-side
- `RESOLUTIONS` - Constantes com resoluções padrão

### Exemplo de Uso

```typescript
// Download com fallback automático
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';

await handleDownloadPhoto(galeria, photoId, index);
// Tenta direto (1920px), se falhar usa proxy (2560px)
```

---

## ⚠️ Regras Importantes

1. **Nunca exceder 2MB**: Todas as resoluções foram escolhidas para garantir arquivos abaixo de 2MB
2. **Priorizar direto**: Sempre tentar `getDirectGoogleUrl` primeiro (economiza banda Vercel)
3. **Fallback automático**: Se direto falhar, usar proxy automaticamente
4. **Sem verificação no cliente**: Não verificar tamanho do blob no cliente (economiza banda)

---

## 📚 Referências

- **Arquivo principal**: `src/core/utils/url-helper.ts`
- **Função de download**: `src/core/utils/foto-helpers.ts`
- **API Proxy**: `src/app/api/galeria/download/[photoId]/route.ts`
- **Hook de imagem**: `src/hooks/useGoogleDriveImage.ts`
