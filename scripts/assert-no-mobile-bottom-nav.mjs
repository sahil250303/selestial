import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const navbar = await readFile(join(process.cwd(), 'src/components/Navbar.jsx'), 'utf8');

const forbidden = [
  'Floating Bottom Navigation for Mobile',
  'md:hidden fixed bottom-6'
];

const found = forbidden.filter(text => navbar.includes(text));

if (found.length > 0) {
  console.error(`Mobile floating bottom navigation is still present: ${found.join(', ')}`);
  process.exitCode = 1;
}
