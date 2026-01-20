const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script que gera variáveis de ambiente com informações do Git
 * Executado durante o build para capturar informações do commit atual
 */

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
    
    // Versão do package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    const version = packageJson.version;
    
    return {
      version,
      commitHash,
      commitDate,
      commitCount,
      branch,
      commitMessage: commitMessage.substring(0, 50), // Limita a 50 caracteres
      buildTime: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('⚠️  Git não disponível, usando valores padrão');
    return {
      version: '0.1.0',
      commitHash: 'unknown',
      commitDate: new Date().toISOString(),
      commitCount: '0',
      branch: 'unknown',
      commitMessage: 'N/A',
      buildTime: new Date().toISOString(),
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
# Última atualização: ${new Date().toISOString()}

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
console.log(`   Build: ${gitInfo.buildTime}`);
