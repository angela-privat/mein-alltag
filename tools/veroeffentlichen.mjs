// Veröffentlicht „Mein Alltag“ auf GitHub Pages (Zweig gh-pages).
// Ablauf: Tests → Bauen → Inhalt von dist/ als neuen Stand nach gh-pages hochladen.
// Aufruf: npm run veroeffentlichen   (GitHub-Konto „angela-privat“ muss aktiv sein)
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'https://github.com/angela-privat/mein-alltag.git';
const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });

run('npm test');
run('npm run build');

const dist = join(process.cwd(), 'dist');
writeFileSync(join(dist, '.nojekyll'), '');
rmSync(join(dist, '.git'), { recursive: true, force: true });

const stand = execSync('git rev-parse --short HEAD').toString().trim();
run('git init -q -b gh-pages', dist);
run('git config user.name angela-privat', dist);
run('git config user.email 359884446+angela-privat@users.noreply.github.com', dist);
run('git config credential.helper ""', dist);
run('git config --add credential.helper "!gh auth git-credential"', dist);
run('git add -A', dist);
run(`git commit -q -m "Veröffentlichung von ${stand}"`, dist);
run(`git push -f ${REPO} gh-pages`, dist);
rmSync(join(dist, '.git'), { recursive: true, force: true });

console.log('\nFertig: https://angela-privat.github.io/mein-alltag/ (kann 1–2 Minuten dauern)');
