import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 🛡️ PROTEÇÃO: Bloqueia imports diretos de arquivos críticos
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "packages/@photos/core-auth/src/index.ts", // ✅ Exceção: index.ts do pacote pode importar para reexportar
      "scripts/**", // Scripts podem usar require()
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                // ❌ Bloqueia imports diretos de serviços críticos
                "**/core/services/auth.service",
                "**/core/services/google.service",
                "**/core/services/token-cleanup.service",
                "**/core/services/google-drive.service",
                // ❌ Bloqueia imports diretos de libs críticas (exceto arquivos críticos)
                "**/lib/supabase.client",
                "**/lib/supabase.server",
                "**/lib/google-auth",
                // ❌ Bloqueia imports diretos de hooks críticos
                "**/hooks/useSupabaseSession",
                // ❌ Bloqueia imports diretos de contextos críticos
                "**/contexts/AuthContext",
                // ❌ Bloqueia imports diretos de lógica crítica
                "**/core/logic/auth-gallery",
                // ❌ Bloqueia imports diretos de rotas críticas
                "**/app/api/auth/callback/route",
                "**/app/api/auth/google/route",
                "**/app/(auth)/auth/logout/route",
                // ❌ Bloqueia imports diretos de middleware
                "**/middleware",
                // ❌ Bloqueia imports diretos de utils críticos
                "**/core/utils/google-oauth-throttle",
              ],
              // ⚠️ EXCEÇÕES: Arquivos críticos podem importar diretamente (são a implementação interna)
              // - packages/@photos/core-auth/src/index.ts (pode importar para reexportar)
              // - src/core/services/* (implementação interna)
              // - src/lib/* (implementação interna)
              // - src/hooks/useSupabaseSession.ts (implementação interna)
              // - src/contexts/AuthContext.tsx (implementação interna)
              // - src/middleware.ts (precisa acesso direto)
              // - src/app/api/auth/* (rotas críticas)
              message: "❌ NÃO IMPORTE ARQUIVOS CRÍTICOS DIRETAMENTE! Use apenas a API pública: import { ... } from '@photos/core-auth'",
            },
            {
              group: [
                // ❌ Bloqueia imports internos do pacote
                "@photos/core-auth/lib/*",
                "@photos/core-auth/src/*",
                "@photos/core-auth/**/services/*",
                "@photos/core-auth/**/lib/*",
              ],
              message: "❌ NÃO IMPORTE ARQUIVOS INTERNOS DO PACOTE! Use apenas a API pública: import { ... } from '@photos/core-auth'",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
