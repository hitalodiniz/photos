# Resumo da Refatoração: Centralização de Lógica Repetida

## Objetivo
Centralizar padrões de código repetidos, especialmente em chamadas ao Supabase e tratamentos de imagem do Google Drive, através de Hooks customizados e Services unificados.

## Mudanças Realizadas

### 1. Hooks Customizados Criados

#### `useGaleria` (`src/hooks/useGaleria.ts`)
- **Propósito**: Centraliza todas as operações CRUD de galeria
- **Funcionalidades**:
  - `fetchGalerias()` - Buscar todas as galerias
  - `handleCreate()` - Criar nova galeria
  - `handleUpdate()` - Atualizar galeria existente
  - `handleToggleArchive()` - Alternar arquivamento
  - `handleToggleShowOnProfile()` - Alternar visibilidade no perfil
  - `handleMoveToTrash()` - Mover para lixeira
  - `handleRestore()` - Restaurar da lixeira
  - `handlePermanentDelete()` - Excluir permanentemente
- **Benefícios**: 
  - Elimina duplicação de lógica de estado (`updatingId`, `loading`)
  - Centraliza tratamento de erros e toasts
  - Facilita manutenção e testes

#### `useGoogleDriveImage` (`src/hooks/useGoogleDriveImage.ts`)
- **Propósito**: Centraliza tratamento de URLs e fallback de imagens do Google Drive
- **Funcionalidades**:
  - Gerenciamento automático de fallback (URL direta → Proxy)
  - Estados de loading/loaded/error
  - Suporte a diferentes tamanhos de imagem
- **Benefícios**:
  - Elimina código duplicado de tratamento de imagens
  - Lógica de fallback centralizada e reutilizável
  - Melhor tratamento de erros

#### `useSupabaseSession` (`src/hooks/useSupabaseSession.ts`)
- **Propósito**: Centraliza autenticação do Supabase e obtenção de tokens do Google
- **Funcionalidades**:
  - Gerenciamento de sessão do Supabase
  - Obtenção de token do Google via server action
  - Escuta mudanças de autenticação
- **Benefícios**:
  - Elimina chamadas repetidas a `supabase.auth.getSession()`
  - Centraliza lógica de autenticação
  - Compatível com código existente via `getAuthDetails()`

### 2. Services Unificados

#### `GoogleDriveService` (`src/core/services/google-drive.service.ts`)
- **Propósito**: Service unificado para operações do Google Drive
- **Métodos**:
  - `getFolderPhotos()` - Busca fotos de uma pasta (centraliza autenticação, token e listagem)
  - `checkDriveAccess()` - Verifica acesso válido ao Google Drive
- **Benefícios**:
  - Elimina duplicação de lógica de autenticação e obtenção de token
  - Tratamento de erros centralizado
  - Reutilizável em múltiplos contextos

#### `auth-context.service.ts` (`src/core/services/auth-context.service.ts`)
- **Propósito**: Service para obter contexto de autenticação (userId + studioId)
- **Benefícios**:
  - Evita dependências circulares
  - Reutilizável em múltiplos services
  - Centraliza lógica de autenticação do Supabase

### 3. Refatorações em Componentes

#### `GooglePickerButton.tsx`
- **Mudança**: Agora usa `useSupabaseSession` em vez de chamadas diretas ao Supabase
- **Benefício**: Código mais limpo e reutilizável

#### `MasonryGrid.tsx` (SafeImage)
- **Mudança**: Componente `SafeImage` agora usa `useGoogleDriveImage`
- **Benefício**: Elimina ~40 linhas de código duplicado de tratamento de imagens

#### `galeria.service.ts`
- **Mudança**: `getGaleriaPhotos()` agora usa `GoogleDriveService` em vez de lógica duplicada
- **Benefício**: Reduz código duplicado e melhora manutenibilidade

### 4. Arquivo de Índice

#### `src/hooks/index.ts`
- Exporta todos os hooks customizados para facilitar importações
- Mantém organização e facilita descoberta de hooks disponíveis

## Padrões Eliminados

### Antes (Código Repetido)
```typescript
// Padrão repetido em múltiplos componentes:
const [loading, setLoading] = useState(false);
const [updatingId, setUpdatingId] = useState<string | null>(null);

const handleArchive = async (g: Galeria) => {
  setUpdatingId(g.id);
  const result = await toggleArchiveGaleria(g.id, g.is_archived);
  if (result.success) {
    setGalerias(prev => prev.map(...));
    setToast({ message: '...', type: 'success' });
  } else {
    setToast({ message: '...', type: 'error' });
  }
  setUpdatingId(null);
};
```

### Depois (Hook Centralizado)
```typescript
const { handleToggleArchive } = useGaleria({
  onSuccess: (msg) => setToast({ message: msg, type: 'success' }),
  onError: (msg) => setToast({ message: msg, type: 'error' })
});

// Uso simples:
handleToggleArchive(galeria);
```

## Impacto

### Redução de Código
- **~200 linhas** de código duplicado eliminadas
- **3 hooks** reutilizáveis criados
- **2 services** unificados

### Melhorias de Manutenibilidade
- Lógica centralizada facilita correções e melhorias
- Testes mais fáceis (hooks isolados)
- Menos pontos de falha (código único vs. múltiplas cópias)

### Próximos Passos Sugeridos
1. Refatorar `Dashboard` para usar `useGaleria` (reduzirá ~100 linhas)
2. Aplicar `useGoogleDriveImage` em outros componentes de imagem
3. Criar testes unitários para os novos hooks
4. Documentar padrões de uso dos hooks

## Arquivos Modificados

### Novos Arquivos
- `src/hooks/useGaleria.ts`
- `src/hooks/useGoogleDriveImage.ts`
- `src/hooks/useSupabaseSession.ts`
- `src/hooks/index.ts`
- `src/core/services/google-drive.service.ts`
- `src/core/services/auth-context.service.ts`

### Arquivos Refatorados
- `src/components/google-drive/GooglePickerButton.tsx`
- `src/features/galeria/MasonryGrid.tsx`
- `src/core/services/galeria.service.ts`

## Compatibilidade
- ✅ Todos os hooks são retrocompatíveis
- ✅ Services mantêm a mesma interface pública
- ✅ Nenhuma breaking change introduzida
