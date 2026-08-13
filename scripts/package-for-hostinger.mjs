import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const stageDir = join(rootDir, 'deploy', 'hostinger', 'stage');
const zipFile = join(rootDir, 'selestial-hostinger-deploy.zip');

console.log('🚀 1/3 Building production frontend...');
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

console.log('📦 2/3 Staging deployment files...');
if (existsSync(stageDir)) {
  rmSync(stageDir, { recursive: true, force: true });
}
mkdirSync(stageDir, { recursive: true });

// Copy runtime files & folders
cpSync(join(rootDir, 'dist'), join(stageDir, 'dist'), { recursive: true });
cpSync(join(rootDir, 'server'), join(stageDir, 'server'), { recursive: true });
cpSync(join(rootDir, 'server.js'), join(stageDir, 'server.js'));
cpSync(join(rootDir, 'package.json'), join(stageDir, 'package.json'));
cpSync(join(rootDir, 'package-lock.json'), join(stageDir, 'package-lock.json'));
cpSync(join(rootDir, 'deploy', 'hostinger', 'env.production.example'), join(stageDir, '.env.example'));

// Ensure server/uploads directory exists in stage
mkdirSync(join(stageDir, 'server', 'uploads'), { recursive: true });

console.log('🗜️  3/3 Creating ZIP archive...');
if (existsSync(zipFile)) {
  rmSync(zipFile, { force: true });
}

try {
  execSync(`powershell -Command "Compress-Archive -Path '${stageDir}/*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
  console.log(`\n✅ Ready! Created upload bundle: ${zipFile}`);
  console.log('👉 Upload this ZIP to Hostinger File Manager in your application root and extract it.');
} catch (err) {
  console.error('Failed to create ZIP automatically:', err);
} finally {
  rmSync(stageDir, { recursive: true, force: true });
}
