# 🎯 Otimização de Meta Tags Open Graph para WhatsApp

## ✅ Implementações Realizadas

### 1. Meta Tags Open Graph Completas
- ✅ `og:image` - URL absoluta da imagem
- ✅ `og:image:type` - `image/jpeg` (explícito)
- ✅ `og:image:width` - `1200` (explícito)
- ✅ `og:image:height` - `900` (explícito)
- ✅ `og:image:alt` - Texto alternativo
- ✅ `og:title` - Título da foto
- ✅ `og:description` - Descrição otimizada
- ✅ `og:type` - `article`
- ✅ `og:url` - URL absoluta da página
- ✅ `og:site_name` - "Sua Galeria"

### 2. Ordem das Tags
O Next.js gera automaticamente as meta tags na ordem correta:
1. `og:image` (primeiro)
2. `og:image:type`
3. `og:image:width`
4. `og:image:height`
5. `og:image:alt`
6. Demais tags Open Graph

### 3. Otimização de Imagem
- ✅ **URL absoluta**: `${baseUrl}/api/og/photo/${googleId}`
- ✅ **Formato**: JPEG (não WebP) para compatibilidade
- ✅ **Tamanho**: 1200px (geralmente < 300KB)
- ✅ **Verificação de tamanho**: Log de aviso se > 300KB
- ✅ **Cache**: 30 dias com stale-while-revalidate

### 4. API Route Otimizada (`/api/og/photo/[googleId]`)
- ✅ Serve imagem diretamente do Google Drive
- ✅ Headers CORS para crawlers
- ✅ Content-Type correto (`image/jpeg`)
- ✅ Verificação de tamanho da imagem
- ✅ Tratamento de erros robusto

## 📋 Checklist de Verificação

### Meta Tags
- [x] `og:image` com URL absoluta
- [x] `og:image:type` definido como `image/jpeg`
- [x] `og:image:width` definido como `1200`
- [x] `og:image:height` definido como `900`
- [x] `og:image:alt` com texto descritivo
- [x] Ordem correta das tags

### Imagem
- [x] URL acessível publicamente
- [x] Formato JPEG (não WebP)
- [x] Tamanho < 300KB (verificado na rota)
- [x] Dimensões adequadas (1200x900)

### SSR
- [x] Meta tags geradas no servidor (`generateMetadata`)
- [x] URL absoluta garantida
- [x] `metadataBase` configurado

## 🔍 Como Testar

1. **Facebook Debugger**:
   - Acesse: https://developers.facebook.com/tools/debug/
   - Cole a URL da foto: `https://suagaleria.com.br/photo/[googleId]?s=[slug]`
   - Clique em "Debug" e verifique se a imagem aparece

2. **WhatsApp**:
   - Compartilhe o link da foto no WhatsApp
   - Verifique se o preview da imagem aparece
   - Se não aparecer, limpe o cache do WhatsApp e tente novamente

3. **Verificação Manual**:
   - Acesse a página da foto
   - Visualize o código-fonte (Ctrl+U)
   - Procure pelas meta tags `og:image*` no `<head>`
   - Verifique se todas estão presentes e na ordem correta

## 🚨 Problemas Comuns

### Imagem não aparece no WhatsApp
1. **Cache do WhatsApp**: O WhatsApp cacheia fortemente. Aguarde alguns minutos ou limpe o cache
2. **Tamanho da imagem**: Verifique se está < 300KB (logs na rota `/api/og/photo/[googleId]`)
3. **URL acessível**: Teste a URL da imagem diretamente no navegador
4. **Formato**: Certifique-se de que é JPEG (não WebP)

### Facebook Debugger mostra, mas WhatsApp não
- WhatsApp tem cache mais agressivo
- Aguarde 5-10 minutos após deploy
- Tente compartilhar em conversa diferente

## 📝 Arquivos Modificados

1. `src/lib/gallery/metadata-helper.ts` - Função `getPhotoMetadata` otimizada
2. `src/app/(public)/photo/[googleId]/page.tsx` - `generateMetadata` melhorado
3. `src/app/api/og/photo/[googleId]/route.ts` - Verificação de tamanho adicionada

## 🎯 Próximos Passos (Opcional)

Se ainda não funcionar:
1. Reduzir tamanho da imagem para 800px (garantir < 300KB)
2. Adicionar compressão adicional na rota `/api/og/photo`
3. Verificar logs do servidor para erros de fetch
4. Testar com imagem de fallback se Google Drive falhar
