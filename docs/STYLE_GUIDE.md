## Luxury Editorial Photography – Guia de Estilo

Este projeto adota o padrão visual **“Luxury Editorial Photography”**.  
Use este arquivo como **referência oficial** para qualquer nova tela, componente ou refatoração de UI.

---

## Cores

- **Champagne**: `#F3E5AB`
  - Uso típico: destaques elegantes, botões premium, badges e elementos de foco.
- **Gold**: `#F3E5AB`
  - Uso típico: ícones de status, bordas de destaque, indicadores de progresso.
- **Azul Petróleo**: `#00212E`
  - **Cor oficial do sistema** - Uso típico: fundos de navbar, sidebar, elementos de navegação principais, textos em fundos escuros.
  - Token Tailwind: `petroleum` (ex.: `bg-petroleum`, `text-petroleum`)
- **Fundo Escuro Editorial**: preto / `slate-950`
  - Uso típico: fundos de seções hero, modais dark, superfícies de interação premium.

No Tailwind, sempre que possível, use os **tokens configurados** (ex.: `bg-champagne`, `text-gold`, `bg-petroleum`, `bg-luxury-bg`) em vez de hex direto.

---

## Tipografia

- **Labels e botões pequenos (microcopy editorial)**:
  - `text-[10px]`
  - `font-bold`
  - `uppercase`
  - `tracking-[0.2em]` **ou** `tracking-widest` (preferencial)
  - Exemplos: rótulos de formulário, CTAs compactos, chips/badges.

Outras regras gerais:

- Evitar textos grandes em uppercase; o efeito editorial deve ficar concentrado em labels, microcopy e CTAs.
- Para textos corridos, priorizar legibilidade (peso médio, sem uppercase e com tracking normal).

---

## Componentes de UI

- **Inputs**:
  - Canto arredondado **`rounded-xl`** ou **`rounded-[0.4rem]`**.
  - Bordas sutis, preferencialmente `border-white/10` em superfícies escuras ou `border-slate-200` em superfícies claras.
  - Estados de foco devem usar **Gold/Champagne** (ex.: `focus:border-gold` / `focus:ring-gold/5`).

- **Botões**:
  - Canto arredondado **`rounded-xl`** ou **`rounded-[0.4rem]`**.
  - Bordas discretas, ex.: `border-white/10` em contextos dark ou `border-slate-200` em light/admin.
  - Botões-editoriais pequenos seguem a tipografia definida acima (text-[10px], bold, uppercase, tracking mais largo).

- **Modais (Dark Premium)**:
  - Fundo principal: `bg-slate-950` ou `bg-[#000]/90` com `backdrop-blur-md`.
  - Bordas: `border-white/10` ou `border-white/20` para manter o brilho sutil.
  - Cabeçalho com ícone e título em uppercase pequeno (`text-[10px]` ou `text-xs`, `font-semibold`, `tracking-widest`).
  - Botões principais dentro de modais devem seguir o padrão editorial (Champagne/Gold + uppercase + `text-[10px]` + `tracking-widest`).

Sempre que possível, reutilizar utilitários/componentes prontos (ex.: `.btn-luxury-primary`, `.btn-luxury-secondary`) em vez de recriar estilos na mão.

---

## Imagens

- Para imagens vindas do **Google Drive**, usar sempre o elemento nativo:

```tsx
<img src={driveUrl} alt={alt} loading="lazy" decoding="async" />
```

- Evitar wrappers desnecessários ou componentes que removam o controle direto desses atributos, principalmente em grids e galerias de alta quantidade.

- **Resoluções e Performance**: Consulte `PERFORMANCE_GUIDE.md` para o guia completo de resoluções recomendadas e estratégia de limite de 2MB por arquivo.

---

## Nomenclatura e Organização

- **Pastas**:
  - Sempre em **kebab-case**
  - Ex.: `photographer-profile`, `gallery-view`, `shared-components`.

- **Componentes React / TSX**:
  - Sempre em **PascalCase**
  - Ex.: `PhotographerCard.tsx`, `GalleryHeader.tsx`, `LimitUpgradeModal.tsx`.

- **Uso deste arquivo**:
  - Qualquer refatoração de UI, nova page ou novo componente deve ser validado contra estas regras.
  - Em caso de conflito entre código legado e este guia, **priorizar o padrão “Luxury Editorial Photography”** descrito aqui.
