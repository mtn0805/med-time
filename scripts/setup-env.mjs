import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const target = new URL('../server/.env', import.meta.url);
const template = await readFile(new URL('../server/.env.example', import.meta.url), 'utf8');
try {
  await writeFile(
    target,
    template.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(48).toString('hex')}`),
    { flag: 'wx', mode: 0o600 },
  );
  console.log('Created server/.env with a random local session secret.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Preserved existing server/.env.');
}
