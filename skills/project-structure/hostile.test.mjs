import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const skillDir = dirname(fileURLToPath(import.meta.url));
const mapTs = join(skillDir, 'map.ts');
const dir = mkdtempSync(join(tmpdir(), 'swift-decl-hostile-'));
const out = join(dir, 'out.txt');
writeFileSync(join(dir, 'Hostile.swift'), `${'  @.'.repeat(40)}\npublic func kept() {}\n`);
const started = Date.now();
try {
  execFileSync(process.execPath, [mapTs, dir, '--out', out], { stdio: ['ignore', 'ignore', 'inherit'] });
  const elapsed = Date.now() - started;
  const text = readFileSync(out, 'utf8');
  if (elapsed > 1000 || !text.includes('kept')) {
    console.error(`FAIL hostile swift line (${elapsed}ms)`);
    process.exit(1);
  }
  console.log(`hostile swift line ok (${elapsed}ms)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
