const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script que gera variáveis de ambiente com informações do Git
 * Executado durante o build para capturar informações do commit atual
 */

/**
 * Converte data para horário de Brasília (UTC-3)
 */
function toBrasiliaTime(date) {
  const brasiliaOffset = -3 * 60; // UTC-3 em minutos
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const brasiliaTime = new Date(utc + (brasiliaOffset * 60000));
  return brasiliaTime;
}

/**
 * Formata data no formato brasileiro
 */
function formatBrasiliaDateTime(date) {
  const brasiliaDate = toBrasiliaTime(date);
  const year = brasiliaDate.getFullYear();
  const month = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
  const day = String(brasiliaDate.getDate()).padStart(2, '0');
  const hours = String(brasiliaDate.getHours()).padStart(2, '0');
  const minutes = String(brasiliaDate.getMinutes()).padStart(2, '0');
  const seconds = String(brasiliaDate.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} -0300`;
}

/**
 * Incrementa a versão patch (ex: 0.1.0 -> 0.1.1)
 */
function incrementVersion(currentVersion) {
  const parts = currentVersion.split('.');
  if (parts.length === 3) {
    const patch = parseInt(parts[2], 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
  return currentVersion;
}

function getGitInfo() {
  try {
    // Hash do commit (7 caracteres)
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    
    // Data do commit (ISO format)
    const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf-8' }).trim();
    
    // Branch atual
    let branch = 'main';
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (e) {
      // Fallback para main
    }
    
    // Número total de commits
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    
    // Mensagem do último commit (primeira linha)
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim().split('\n')[0];
    
    // Versão do package.json - incrementa automaticamente
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;
    const newVersion = incrementVersion(currentVersion);
    
    // Atualiza a versão no package.json
    if (newVersion !== currentVersion) {
      packageJson.version = newVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`📦 Versão incrementada: ${currentVersion} -> ${newVersion}`);
    }
    
    // Build time em horário de Brasília
    const buildDate = new Date();
    const buildTime = formatBrasiliaDateTime(buildDate);
    
    return {
      version: newVersion,
      commitHash,
      commitDate,
      commitCount,
      branch,
      commitMessage: commitMessage.substring(0, 50), // Limita a 50 caracteres
      buildTime,
    };
  } catch (error) {
    console.warn('⚠️  Git não disponível, usando valores padrão');
    const buildDate = new Date();
    const buildTime = formatBrasiliaDateTime(buildDate);
    return {
      version: '0.1.0',
      commitHash: 'unknown',
      commitDate: buildTime,
      commitCount: '0',
      branch: 'unknown',
      commitMessage: 'N/A',
      buildTime,
    };
  }
}

// Gera o arquivo .env.local com as informações
const gitInfo = getGitInfo();
const envPath = path.join(__dirname, '../.env.local');

// Lê o arquivo .env.local existente (se existir) para preservar outras variáveis
let existingEnvContent = '';
if (fs.existsSync(envPath)) {
  existingEnvContent = fs.readFileSync(envPath, 'utf-8');
}

// Remove apenas as variáveis de versão antigas (se existirem)
const versionVars = [
  'NEXT_PUBLIC_APP_VERSION',
  'NEXT_PUBLIC_COMMIT_HASH',
  'NEXT_PUBLIC_COMMIT_DATE',
  'NEXT_PUBLIC_COMMIT_COUNT',
  'NEXT_PUBLIC_BRANCH',
  'NEXT_PUBLIC_COMMIT_MESSAGE',
  'NEXT_PUBLIC_BUILD_TIME',
];

let cleanedEnvContent = existingEnvContent;
versionVars.forEach((varName) => {
  // Remove a variável e sua linha (com ou sem comentário)
  const regex = new RegExp(`^#?\\s*${varName}=.*$`, 'gm');
  cleanedEnvContent = cleanedEnvContent.replace(regex, '');
});

// Remove linhas vazias duplicadas e limpa o conteúdo
cleanedEnvContent = cleanedEnvContent
  .split('\n')
  .filter((line) => line.trim() !== '')
  .join('\n');

// Adiciona as novas variáveis de versão
const versionEnvContent = `# Informações de versão geradas automaticamente pelo Git
# Este arquivo é gerado automaticamente durante o build
# Última atualização: ${formatBrasiliaDateTime(new Date())}

NEXT_PUBLIC_APP_VERSION=${gitInfo.version}
NEXT_PUBLIC_COMMIT_HASH=${gitInfo.commitHash}
NEXT_PUBLIC_COMMIT_DATE=${gitInfo.commitDate}
NEXT_PUBLIC_COMMIT_COUNT=${gitInfo.commitCount}
NEXT_PUBLIC_BRANCH=${gitInfo.branch}
NEXT_PUBLIC_COMMIT_MESSAGE=${gitInfo.commitMessage.replace(/\n/g, ' ').replace(/"/g, '\\"')}
NEXT_PUBLIC_BUILD_TIME=${gitInfo.buildTime}
`;

// Combina o conteúdo existente (limpo) com as novas variáveis de versão
const finalEnvContent = cleanedEnvContent
  ? `${cleanedEnvContent}\n\n${versionEnvContent}`
  : versionEnvContent;

// Escreve no arquivo .env.local preservando as variáveis existentes
fs.writeFileSync(envPath, finalEnvContent);

console.log('✅ Variáveis de versão geradas:');
console.log(`   Versão: ${gitInfo.version}`);
console.log(`   Commit: ${gitInfo.commitHash}`);
console.log(`   Branch: ${gitInfo.branch}`);
console.log(`   Data: ${gitInfo.commitDate}`);
console.log(`   Build: ${gitInfo.buildTime} (Horário de Brasília)`);
