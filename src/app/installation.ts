import { useSyncExternalStore } from 'react';

/**
 * Merkt sich das „Installieren“-Angebot von Chrome, damit die App einen
 * eigenen Knopf „App installieren“ zeigen kann.
 */
interface InstallEreignis extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let angebot: InstallEreignis | null = null;
const zuhoerer = new Set<() => void>();
const melden = () => zuhoerer.forEach((z) => z());

export function installationVorbereiten(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    angebot = e as InstallEreignis;
    melden();
  });
  window.addEventListener('appinstalled', () => {
    angebot = null;
    melden();
  });
}

export function istInstalliert(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function useInstallAngebot(): InstallEreignis | null {
  return useSyncExternalStore(
    (z) => {
      zuhoerer.add(z);
      return () => zuhoerer.delete(z);
    },
    () => angebot
  );
}

export async function installieren(): Promise<boolean> {
  if (!angebot) return false;
  await angebot.prompt();
  const { outcome } = await angebot.userChoice;
  angebot = null;
  melden();
  return outcome === 'accepted';
}
