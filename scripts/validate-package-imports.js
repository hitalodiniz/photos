#!/usr/bin/env node

/**
 * 🛡️ VALIDAÇÃO DE IMPORTS DO PACOTE CRÍTICO
 *
 * Este script valida que não há imports diretos de arquivos críticos.
 * Deve ser usado apenas via API pública do pacote @photos/core-auth.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Padrões de imports bloqueados
const BLOCKED_PATTERNS = [
  /from ['"]@\/core\/services\/(auth|google|token-cleanup)\.service/,
  /from ['"]@\/lib\/(supabase\.(client|server)|google-auth)/,
  /from ['"]@\/hooks\/useSupabaseSession/,
  /from ['"]@\/contexts\/AuthContext/,
  /from ['"]@\/core\/logic\/auth-gallery/,
  /from ['"]@\/app\/api\/auth\/(callback|google)\/route/,
  /from ['"]@\/middleware/,
  /from ['"]@\/core\/utils\/google-oauth-throttle/,
  /from ['"]@photos\/core-auth\/(lib|src|services|hooks|contexts|logic)/,
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 🎯 Server Actions são exceções legítimas - eles são a API pública
    // Arquivos com 'use server' podem importar diretamente dos serviços críticos
    const isServerAction =
      content.trim().startsWith("'use server'") ||
      content.trim().startsWith('"use server"') ||
      content.trim().startsWith("'use server';") ||
      content.trim().startsWith('"use server";');

    if (isServerAction) {
      // Server actions são permitidos importar diretamente
      return [];
    }

    // 🎯 Serviços críticos podem importar de outros arquivos críticos internos
    // Eles são a implementação base e precisam acessar diretamente
    const isCriticalService = CRITICAL_SERVICES.some((service) =>
      filePath.includes(service),
    );
    if (isCriticalService) {
      // Serviços críticos podem importar de libs críticas internas
      return [];
    }

    const violations = [];

    BLOCKED_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        violations.push({
          line: content.substring(0, content.indexOf(matches[0])).split('\n')
            .length,
          match: matches[0],
        });
      }
    });

    return violations;
  } catch (error) {
    return [];
  }
}

function getChangedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    const modified = execSync('git diff --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    return [...new Set([...staged, ...modified])]
      .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
      .filter((file) => !file.includes('node_modules'))
      .filter((file) => !file.includes('packages/@photos/core-auth')) // Ignora o próprio pacote
      .filter((file) => !file.match(/\.(spec|test)\.(ts|tsx|js|jsx)$/)); // 🎯 Ignora arquivos de teste
  } catch (error) {
    return [];
  }
}

// 🎯 Arquivos que são serviços críticos e podem importar de outros arquivos críticos internos
const CRITICAL_SERVICES = [
  'src/core/services/google.service.ts',
  'src/core/services/auth.service.ts',
  'src/core/services/notification.service.ts',
  'src/core/services/token-cleanup.service.ts',
  'src/core/services/google-drive.service.ts',
  'src/core/logic/galeria-logic.ts',
  'src/hooks/useSupabaseSession.ts',
  'src/components/providers/AuthContext.tsx',
];

function main() {
  const changedFiles = getChangedFiles();
  const allViolations = [];

  changedFiles.forEach((file) => {
    const violations = checkFile(file);
    if (violations.length > 0) {
      allViolations.push({ file, violations });
    }
  });

  if (allViolations.length === 0) {
    console.log('✅ Nenhum import direto de arquivo crítico detectado');
    return 0;
  }

  console.error('\n❌ IMPORTS DIRETOS DE ARQUIVOS CRÍTICOS DETECTADOS!\n');

  allViolations.forEach(({ file, violations }) => {
    console.error(`  ${file}:`);
    violations.forEach(({ line, match }) => {
      console.error(`    Linha ${line}: ${match}`);
    });
    console.error('');
  });

  console.error('⚠️  Use apenas a API pública do pacote:');
  console.error("   import { authService } from '@photos/core-auth';");
  console.error('');
  console.error('📖 Leia PROTECTION_SYSTEM.md para mais informações.\n');

  return 1;
}

const exitCode = main();
process.exit(exitCode);
