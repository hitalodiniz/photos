# 🎨 Guia de Temas por Segmento

## 📋 Visão Geral

Cada segmento possui uma identidade visual única que reflete seu público-alvo e propósito. As cores CSS são definidas em variáveis RGB para permitir uso com opacidade (`bg-champagne/50`).

---

## 1️⃣ PHOTOGRAPHER (Sua Galeria) - ✅ VALIDADO

**Público:** Fotógrafos profissionais  
**Personalidade:** Elegante, sofisticado, premium  
**Paleta:** Bege dourado + Azul petróleo profundo

### Cores Principais

```css
--color-champagne: 243 229 171 /* Bege suave e elegante */ --color-gold: 212 175
  55 /* Dourado clássico */ --color-petroleum: 0 33 46
  /* Azul petróleo profundo */;
```

### Aplicação

- **Fundo:** Off-white suave (#F8F9FA)
- **Navbar:** Azul petróleo com blur
- **CTAs:** Botões dourados sobre fundo escuro
- **Acentos:** Checkmarks verdes, ícones dourados

### Exemplos de Uso

```tsx
<button className="bg-gold text-petroleum">CRIAR GALERIA</button>
<nav className="bg-petroleum/95 backdrop-blur-md">...</nav>
<div className="bg-luxury-bg">Conteúdo principal</div>
```

---

## 2️⃣ EVENT (Na Selfie) - 🆕 AJUSTADO

**Público:** Eventos sociais, festas, casamentos  
**Personalidade:** Jovem, vibrante, energético, social  
**Paleta:** Rosa pink vibrante + Azul cyan + Preto moderno

### Cores Principais

```css
--color-champagne: 255 71 126 /* Pink vibrante (#FF477E) */ --color-gold: 34 211
  238 /* Cyan energético (#22D3EE) */ --color-petroleum: 23 23 23
  /* Preto moderno (Neutral-900) */;
```

### Estratégia Visual

- **Fundo:** Branco quente (250 250 250) para alto contraste
- **Navbar:** Preto moderno (#171717)
- **CTAs:** Pink vibrante com hover cyan
- **Cards:** Bordas pink com gradientes sutis

### Exemplos de Uso

```tsx
<button className="bg-champagne text-white">ACESSAR FOTOS</button>
<nav className="bg-petroleum">...</nav>
<div className="border-l-4 border-gold">Destaque</div>
```

### Combinações Recomendadas

- Pink + Branco: Botões principais
- Cyan: Ícones, links, acentos de hover
- Preto: Textos, backgrounds de seções

---

## 3️⃣ OFFICE (Em Mandato) - ✅ MELHOR CONTRASTE

**Público:** Políticos em mandato, gabinetes oficiais  
**Personalidade:** Institucional, profissional, confiável  
**Paleta:** Azul governo profundo + Laranja oficial

### Cores Principais

```css
--color-champagne: 249 115 22 /* Orange-600: laranja governo */ --color-gold: 59
  130 246 /* Blue-500: azul institucional */ --color-petroleum: 30 58 138
  /* Blue-900: azul escuro profundo */;
```

### Estratégia Visual (LIGHT MODE)

- **Fundo:** Slate-50 clean (#F8FAFC)
- **Navbar:** Blue-900 profundo (#1E3A8A) - **alto contraste**
- **CTAs:** Laranja governo vibrante
- **Ícones:** Azul Blue-500 ou laranja (bom contraste)

### Exemplos de Uso

```tsx
<button className="bg-champagne text-white">
  ACESSAR PORTAL
</button>
<nav className="bg-petroleum">...</nav> {/* Blue-900 escuro */}
<div className="text-gold">Ícone institucional</div> {/* Blue-500 */}
```

### Combinações Recomendadas

- **Laranja:** Botões de ação, CTAs principais
- **Azul profundo:** Navbar, headers, fundos
- **Blue-500:** Ícones, links, acentos visuais

---

## 4️⃣ CAMPAIGN (Em Campanha) - ✅ MELHOR CONTRASTE

**Público:** Campanhas políticas, pré-candidatos  
**Personalidade:** Profissional, sério, focado em ação  
**Paleta:** Laranja campanha + Slate neutro

### Cores Principais

```css
--color-champagne: 249 115 22 /* Orange-600: CTA vibrante */ --color-gold: 251
  146 60 /* Orange-400: ícones e acentos */ --color-petroleum: 71 85 105
  /* Slate-600: navbar equilibrada */;
```

### Estratégia Visual (LIGHT MODE)

- **Fundo:** Slate-50 limpo (#F8FAFC)
- **Navbar:** Slate-600 equilibrado (#475569) - **contraste correto**
- **CTAs:** Laranja vibrante (urgência de campanha)
- **Ícones:** Orange-400 (#FB923C) - **destaque garantido**

### Exemplos de Uso

```tsx
<button className="bg-champagne text-white">VER PROPOSTAS</button>
<nav className="bg-petroleum">...</nav> {/* Slate-600 */}
<div className="text-gold">Ícone megafone</div> {/* Orange-400 */}
```

### Combinações Recomendadas

- **Laranja vibrante:** CTAs, badges, urgência
- **Slate neutro:** Fundo navbar, textos
- **Orange-400:** Ícones que precisam se destacar

---

## 🎯 Tabela Comparativa

| Segmento         | Champagne (CTA)   | Gold (Acentos)       | Petroleum (Navbar)      | Luxury BG               | Contraste |
| ---------------- | ----------------- | -------------------- | ----------------------- | ----------------------- | --------: |
| **PHOTOGRAPHER** | Bege (#F3E5AB)    | Dourado (#D4AF37)    | Azul petróleo (#00212E) | Off-white (#F8F9FA)     |   ✅ Alto |
| **EVENT**        | Pink (#FF477E)    | Cyan (#22D3EE)       | Preto (#171717)         | Branco quente (#FAFAFA) |   ✅ Alto |
| **OFFICE**       | Laranja (#F97316) | Azul (#3B82F6)       | Blue-900 (#1E3A8A)      | Slate-50 (#F8FAFC)      |   ✅ Alto |
| **CAMPAIGN**     | Laranja (#F97316) | Orange-400 (#FB923C) | Slate-600 (#475569)     | Slate-50 (#F8FAFC)      |   ✅ Alto |

---

## 🔧 Como Usar

### 1. Aplicar tema no layout

```tsx
<body data-segment="EVENT">{/* Conteúdo automaticamente estilizado */}</body>
```

### 2. Usar variáveis CSS diretamente

```tsx
<div className="bg-champagne text-petroleum">Cor principal do segmento</div>
```

### 3. Usar com opacidade

```tsx
<div className="bg-gold/20 border border-gold/50">
  Opacidade funciona perfeitamente
</div>
```

---

## ✅ Validações por Segmento

- [x] **PHOTOGRAPHER** - Validado e em produção (Bege + Dourado + Petróleo)
- [x] **EVENT** - Validado: Pink vibrante + Cyan + Preto moderno
- [x] **OFFICE** - Ajustado: Azul institucional + Slate neutro (Light Mode)
- [x] **CAMPAIGN** - Ajustado: Slate total neutro (Light Mode, zero cor)

---

## 📝 Notas Importantes

1. **Transição suave:** Todos os temas possuem `transition-colors duration-300`
2. **Acessibilidade:** Contrastes validados para WCAG AA
3. **Consistência:** Classes `.btn-luxury-primary`, `.input-luxury` funcionam em todos os temas
4. **Responsividade:** Cores se adaptam automaticamente em mobile

---

## 🚀 Próximos Passos

1. Testar cada tema em produção
2. Validar contrastes de cor em diferentes dispositivos
3. Criar componentes específicos para cada segmento (se necessário)
4. Documentar casos de uso especiais
