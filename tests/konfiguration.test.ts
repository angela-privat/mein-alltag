import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { begruessung } from '../src/modules/heute/Heute';
import { MODUL_INFOS } from '../src/app/module';
import { MODULE } from '../src/db/einstellungen';

describe('Begrüßung', () => {
  it('passt zur Tageszeit', () => {
    expect(begruessung(7)).toBe('Guten Morgen');
    expect(begruessung(13)).toBe('Guten Tag');
    expect(begruessung(20)).toBe('Guten Abend');
    expect(begruessung(2)).toBe('Gute Nacht');
  });
});

describe('Module', () => {
  it('jedes Modul hat Infos für Anzeige und Einstellungen', () => {
    expect(MODUL_INFOS.map((m) => m.schluessel).sort()).toEqual(MODULE.map((m) => m.schluessel).sort());
  });
});

describe('Trennung von „Fit mit Herz“', () => {
  const vite = readFileSync('vite.config.ts', 'utf8');
  it('App, Manifest und Service Worker sind auf /mein-alltag/ begrenzt', () => {
    expect(vite).toContain("const BASIS = '/mein-alltag/'");
    expect(vite).toMatch(/scope: BASIS/);
    expect(vite).toMatch(/start_url: BASIS/);
    expect(vite).not.toMatch(/(scope|start_url|base|id):\s*['"][^'"]*fit-mit-herz/);
  });

  it('.gitignore schließt persönliche Sicherungen und Fotos aus', () => {
    const ignore = readFileSync('.gitignore', 'utf8');
    for (const muster of ['*.mein-alltag.json', 'backup/', '*.jpg', 'node_modules/', 'dist/']) {
      expect(ignore).toContain(muster);
    }
  });
});
