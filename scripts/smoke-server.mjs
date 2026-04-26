import { spawn } from 'node:child_process';

const port = process.env.SMOKE_PORT || '3137';
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: port },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';
child.stdout.on('data', chunk => {
  stdout += chunk.toString();
});
child.stderr.on('data', chunk => {
  stderr += chunk.toString();
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForHealth() {
  const deadline = Date.now() + 8000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response.json();
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await wait(250);
  }

  throw lastError || new Error('Timed out waiting for server health');
}

try {
  const health = await waitForHealth();
  if (health.status !== 'ok') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
  }

  const spaResponse = await fetch(`${baseUrl}/products`);
  const html = await spaResponse.text();
  if (!spaResponse.ok || !html.includes('<div id="root"></div>')) {
    throw new Error(`SPA fallback failed with status ${spaResponse.status}`);
  }
} catch (error) {
  console.error(error.message);
  if (stdout.trim()) console.error(`\nSTDOUT:\n${stdout.trim()}`);
  if (stderr.trim()) console.error(`\nSTDERR:\n${stderr.trim()}`);
  process.exitCode = 1;
} finally {
  if (child.exitCode === null) {
    child.kill();
  }
}
