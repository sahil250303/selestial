import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const files = [
  'src/pages/Auth.jsx',
  'src/pages/Profile.jsx'
];

const forbidden = 'http://localhost:3000';
const offenders = [];

for (const file of files) {
  const contents = await readFile(join(process.cwd(), file), 'utf8');
  if (contents.includes(forbidden)) {
    offenders.push(file);
  }
}

if (offenders.length > 0) {
  console.error(`Deployment-blocking localhost API URLs found in: ${offenders.join(', ')}`);
  process.exitCode = 1;
}
