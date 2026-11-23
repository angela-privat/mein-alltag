/** Bittet Chrome, die Daten nicht automatisch zu löschen („dauerhafter Speicher“). */
export async function dauerhaftenSpeicherAnfordern(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export interface SpeicherStatus {
  dauerhaft: boolean;
  belegtMB?: number;
  freiMB?: number;
}

export async function speicherStatus(): Promise<SpeicherStatus> {
  const dauerhaft = (await navigator.storage?.persisted?.()) ?? false;
  const schaetzung = await navigator.storage?.estimate?.();
  if (!schaetzung) return { dauerhaft };
  const mb = (b: number) => Math.round((b / 1_048_576) * 10) / 10;
  return {
    dauerhaft,
    belegtMB: mb(schaetzung.usage ?? 0),
    freiMB: mb((schaetzung.quota ?? 0) - (schaetzung.usage ?? 0))
  };
}
