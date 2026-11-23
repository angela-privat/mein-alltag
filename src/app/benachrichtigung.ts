// Handy-Benachrichtigungen (nur solange die App offen ist oder im Hintergrund noch läuft).
import { useSyncExternalStore } from 'react';

export type Erlaubnis = 'erlaubt' | 'abgelehnt' | 'offen' | 'nicht-moeglich';

export function erlaubnis(): Erlaubnis {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return 'nicht-moeglich';
  if (Notification.permission === 'granted') return 'erlaubt';
  if (Notification.permission === 'denied') return 'abgelehnt';
  return 'offen';
}

const zuhoerer = new Set<() => void>();
function melden() {
  zuhoerer.forEach((z) => z());
}

export function useErlaubnis(): Erlaubnis {
  return useSyncExternalStore(
    (z) => {
      zuhoerer.add(z);
      return () => zuhoerer.delete(z);
    },
    erlaubnis
  );
}

export async function erlaubnisAnfragen(): Promise<Erlaubnis> {
  if (erlaubnis() === 'nicht-moeglich') return 'nicht-moeglich';
  await Notification.requestPermission();
  melden();
  return erlaubnis();
}

/** Zeigt eine Benachrichtigung über den Service Worker (auf Android der einzige Weg). */
export async function benachrichtigen(titel: string, text: string, kennung: string): Promise<boolean> {
  if (erlaubnis() !== 'erlaubt') return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    await reg.showNotification(titel, {
      body: text,
      tag: kennung,
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      data: { url: `${import.meta.env.BASE_URL}#/erinnerungen` }
    });
    return true;
  } catch {
    return false;
  }
}

/** Zahl am App-Symbol (wo vom Handy unterstützt). */
export function zahlAmSymbol(anzahl: number): void {
  const n = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (anzahl > 0) n.setAppBadge?.(anzahl)?.catch(() => {});
    else n.clearAppBadge?.()?.catch(() => {});
  } catch {
    /* nicht unterstützt */
  }
}
