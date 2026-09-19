import { mkdirSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs';

const [alias, target] = process.argv.slice(2);
if (!alias || !target) {
  console.error('uso: node scripts/add-alias.mjs "@alias/*" "./src/ruta/*"');
  process.exit(1);
}

const lock = 'tsconfig.alias.lock';
const deadline = Date.now() + 15000;
for (;;) {
  try {
    mkdirSync(lock);
    break;
  } catch {
    if (Date.now() > deadline) {
      console.error('no se pudo obtener el bloqueo de tsconfig.json');
      process.exit(2);
    }
    const wait = Date.now() + 50;
    while (Date.now() < wait) {}
  }
}

try {
  const text = readFileSync('tsconfig.json', 'utf8');
  if (text.includes(`"${alias}"`)) {
    console.log(`el alias ${alias} ya existe`);
  } else {
    const anchor = '      "@common/*": ["./src/common/*"],';
    if (!text.includes(anchor)) throw new Error('ancla @common no encontrada');
    writeFileSync('tsconfig.json', text.replace(anchor, `${anchor}\n      "${alias}": ["${target}"],`));
    console.log(`alias ${alias} agregado`);
  }
} finally {
  rmdirSync(lock);
}
