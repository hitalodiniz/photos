const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Converte data para horário de Brasília (UTC-3)
 */
function formatBrasiliaDateTime(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const brasiliaDate = new Date(utc + -3 * 60 * 60000);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    `${brasiliaDate.getFullYear()}-${pad(brasiliaDate.getMonth() + 1)}-${pad(brasiliaDate.getDate())} ` +
    `${pad(brasiliaDate.getHours())}:${pad(brasiliaDate.getMinutes())}:${pad(brasiliaDate.getSeconds())} -0300`
  );
}

/**
 * Lógica de incremento SemVer baseada na mensagem do commit
 */
function getIncrementedVersion(currentVersion, commitMessage, isBuildMode) {
  if (!isBuildMode) return currentVersion;

  const parts = currentVersion.split('.').map(Number);
  const msg = commitMessage.toLowerCase();

  if (msg.includes('[major]') || msg.includes('breaking change')) {
    parts[0]++; // Major: Grandes mudanças
    parts[1] = 0;
    parts[2] = 0;
  } else if (msg.includes('[minor]') || msg.includes('feat')) {
    parts[1]++; // Minor: Novas funcionalidades
    parts[2] = 0;
  } else {
    parts[2]++; // Patch: Correção de bugs
  }

  return parts.join('.');
}

function getGitInfo(isBuildMode) {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
    }).trim();
    const commitDate = execSync('git log -1 --format=%ci', {
      encoding: 'utf-8',
    }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    }).trim();
    const commitCount = execSync('git rev-list --count HEAD', {
      encoding: 'utf-8',
    }).trim();
    const fullCommitMessage = execSync('git log -1 --pretty=%B', {
      encoding: 'utf-8',
    }).trim();
    const commitMessage = fullCommitMessage.split('\n')[0];

    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;

    const newVersion = getIncrementedVersion(
      currentVersion,
      fullCommitMessage,
      isBuildMode,
    );

    if (isBuildMode && newVersion !== currentVersion) {
      packageJson.version = newVersion;
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n',
      );
      console.log(
        `📦 Versão atualizada no package.json: ${currentVersion} -> ${newVersion}`,
      );
    }

    return {
      version: newVersion,
      commitHash,
      commitDate,
      commitCount,
      branch,
      commitMessage: commitMessage.substring(0, 50),
      buildTime: formatBrasiliaDateTime(new Date()),
    };
  } catch (error) {
    console.warn('⚠️ Git indisponível. Usando valores padrão.');
    return {
      version: '0.1.0',
      commitHash: 'unknown',
      commitDate: new Date().toISOString(),
      commitCount: '0',
      branch: 'unknown',
      commitMessage: 'N/A',
      buildTime: formatBrasiliaDateTime(new Date()),
    };
  }
}

// Inicialização
const isBuildMode = process.argv.includes('--build');
const gitInfo = getGitInfo(isBuildMode);
const envPath = path.join(__dirname, '../.env.local');

// Gerencia o .env.local preservando variáveis existentes
let envContent = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf-8')
  : '';

const versionVars = {
  NEXT_PUBLIC_APP_VERSION: gitInfo.version,
  NEXT_PUBLIC_COMMIT_HASH: gitInfo.commitHash,
  NEXT_PUBLIC_COMMIT_DATE: gitInfo.commitDate,
  NEXT_PUBLIC_COMMIT_COUNT: gitInfo.commitCount,
  NEXT_PUBLIC_BRANCH: gitInfo.branch,
  NEXT_PUBLIC_COMMIT_MESSAGE: gitInfo.commitMessage.replace(/"/g, '\\"'),
  NEXT_PUBLIC_BUILD_TIME: gitInfo.buildTime,
};

// Atualiza ou adiciona as variáveis no conteúdo lido
Object.entries(versionVars).forEach(([key, value]) => {
  const regex = new RegExp(`^${key}=.*$`, 'gm');
  if (envContent.match(regex)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
});

fs.writeFileSync(envPath, envContent.trim() + '\n');

console.log(
  `✅ [${isBuildMode ? 'BUILD' : 'DEV'}] Info gerada: v${gitInfo.version} (${gitInfo.commitHash})`,
);
