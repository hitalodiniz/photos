#!/usr/bin/env node

/**
 * 🛡️ SISTEMA DE PROTEÇÃO DE ARQUIVOS CRÍTICOS
 * 
 * Este script valida alterações em arquivos críticos e bloqueia commits
 * não autorizados que possam comprometer a segurança da aplicação.
 * 
 * USO:
 *   node scripts/protect-critical-files.js [--allow-critical-changes]
 * 
 * FLAGS:
 *   --allow-critical-changes: Permite alterações em arquivos críticos (requer justificativa)
 *   --check-only: Apenas verifica, não bloqueia
 *   --list: Lista todos os arquivos protegidos
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 🎯 ARQUIVOS CRÍTICOS - NÃO ALTERAR SEM APROVAÇÃO
const CRITICAL_FILES = {
  // Autenticação e Autorização
  'src/middleware.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Proteção de rotas e verificação de autenticação',
  },
  'src/app/api/auth/callback/route.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Callback OAuth do Google e criação de sessão',
  },
  'src/app/api/auth/google/route.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Rota de login Google OAuth',
  },
  'src/app/(auth)/auth/logout/route.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Rota de logout',
  },
  'src/core/services/auth.service.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Serviço central de autenticação',
  },
  'src/core/logic/auth-gallery.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Autenticação de galerias protegidas',
  },
  'src/contexts/AuthContext.tsx': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Contexto global de autenticação',
  },
  'src/hooks/useSupabaseSession.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Hook de sessão do Supabase',
  },
  'src/lib/supabase.client.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Cliente Supabase do browser',
  },
  'src/lib/supabase.server.ts': {
    level: 'MAXIMUM',
    category: 'AUTH',
    description: 'Cliente Supabase do servidor',
  },
  
  // Google Drive API
  'src/core/services/google.service.ts': {
    level: 'MAXIMUM',
    category: 'GOOGLE',
    description: 'Serviço de gerenciamento de tokens do Google',
  },
  'src/core/services/google-drive.service.ts': {
    level: 'MAXIMUM',
    category: 'GOOGLE',
    description: 'Serviço de acesso ao Google Drive',
  },
  'src/lib/google-auth.ts': {
    level: 'MAXIMUM',
    category: 'GOOGLE',
    description: 'Autenticação Google',
  },
  'src/actions/google.actions.ts': {
    level: 'MAXIMUM',
    category: 'GOOGLE',
    description: 'Server actions do Google',
  },
  'src/core/utils/google-oauth-throttle.ts': {
    level: 'MAXIMUM',
    category: 'GOOGLE',
    description: 'Rate limiting para Google OAuth',
  },
  
  // Tokens e Segurança
  'src/core/services/token-cleanup.service.ts': {
    level: 'MAXIMUM',
    category: 'SECURITY',
    description: 'Limpeza de tokens inválidos',
  },
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getChangedFiles() {
  try {
    // Pega arquivos staged (prontos para commit)
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    
    // Pega arquivos modificados (não staged)
    const modified = execSync('git diff --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    
    return [...new Set([...staged, ...modified])];
  } catch (error) {
    return [];
  }
}

function checkCriticalFiles(changedFiles) {
  const criticalChanges = [];
  
  for (const file of changedFiles) {
    const normalizedPath = file.replace(/\\/g, '/');
    if (CRITICAL_FILES[normalizedPath]) {
      criticalChanges.push({
        file: normalizedPath,
        ...CRITICAL_FILES[normalizedPath],
      });
    }
  }
  
  return criticalChanges;
}

function main() {
  const args = process.argv.slice(2);
  const allowChanges = args.includes('--allow-critical-changes');
  const checkOnly = args.includes('--check-only');
  const listOnly = args.includes('--list');
  const skipProtection = process.env.SKIP_PROTECTION === 'true';
  
  // Lista arquivos protegidos
  if (listOnly) {
    log('\n🛡️  ARQUIVOS CRÍTICOS PROTEGIDOS\n', 'bold');
    Object.entries(CRITICAL_FILES).forEach(([file, info]) => {
      log(`  ${file}`, 'cyan');
      log(`    Nível: ${info.level} | Categoria: ${info.category}`, 'yellow');
      log(`    ${info.description}\n`, 'reset');
    });
    return 0;
  }
  
  // Verifica se proteção está desabilitada
  if (skipProtection) {
    log('⚠️  PROTEÇÃO DESABILITADA (SKIP_PROTECTION=true)', 'yellow');
    log('⚠️  Use apenas em emergências!\n', 'yellow');
    return 0;
  }
  
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    if (!checkOnly) {
      log('✅ Nenhum arquivo modificado', 'green');
    }
    return 0;
  }
  
  const criticalChanges = checkCriticalFiles(changedFiles);
  
  if (criticalChanges.length === 0) {
    if (!checkOnly) {
      log('✅ Nenhum arquivo crítico modificado', 'green');
    }
    return 0;
  }
  
  // Mostra arquivos críticos alterados
  log('\n🚨 ARQUIVOS CRÍTICOS DETECTADOS!\n', 'red');
  criticalChanges.forEach(({ file, level, category, description }) => {
    log(`  ${file}`, 'red');
    log(`    Nível: ${level} | Categoria: ${category}`, 'yellow');
    log(`    ${description}\n`, 'reset');
  });
  
  // Verifica se tem permissão
  if (allowChanges) {
    log('⚠️  ALTERAÇÕES CRÍTICAS PERMITIDAS (--allow-critical-changes)', 'yellow');
    log('⚠️  Certifique-se de que:\n', 'yellow');
    log('  ✅ Todos os testes passam', 'green');
    log('  ✅ Revisão de código aprovada', 'green');
    log('  ✅ Documentação atualizada', 'green');
    log('  ✅ Impacto da mudança foi avaliado\n', 'green');
    return 0;
  }
  
  // Bloqueia commit
  log('\n❌ COMMIT BLOQUEADO!\n', 'red');
  log('Para fazer alterações em arquivos críticos:', 'yellow');
  log('  1. Use a flag --allow-critical-changes', 'cyan');
  log('  2. Ou adicione ao arquivo de exceções\n', 'cyan');
  log('Exemplo:', 'yellow');
  log('  git commit -m "fix: correção crítica" --allow-critical-changes\n', 'cyan');
  log('Leia PROTECTION_SYSTEM.md para mais informações.\n', 'blue');
  
  return 1;
}

// Executa
const exitCode = main();
process.exit(exitCode);
