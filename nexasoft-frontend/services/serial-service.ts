import type { SerialLookupResult, SerializedProduct, SerialStatus } from "@/types/serial";
import { mockSerializedProducts } from "@/data/serial-mock-data";
import { buildSerialHistory, matchesSerialQuery } from "@/lib/serial-utils";

let serials: SerializedProduct[] = [...mockSerializedProducts];

export async function getAllSerials(): Promise<SerializedProduct[]> {
  return serials;
}

export async function lookupSerial(query: string): Promise<SerialLookupResult> {
  const q = query.trim();
  if (!q) return { found: false, query: q };

  const exact = serials.find(
    (s) =>
      s.serialNumber.toLowerCase() === q.toLowerCase() ||
      (s.barcode ?? "").toLowerCase() === q.toLowerCase() ||
      (s.internalTrackingNo ?? "").toLowerCase() === q.toLowerCase()
  );

  if (!exact) return { found: false, query: q };

  return { found: true, item: exact, history: buildSerialHistory(exact) };
}

export async function searchSerials(query: string, limit = 10): Promise<SerializedProduct[]> {
  const q = query.trim();
  if (!q) return [];
  return serials.filter((s) => matchesSerialQuery(s, q)).slice(0, limit);
}

export async function updateSerialStatus(
  id: string,
  status: SerialStatus,
  notes?: string
): Promise<SerializedProduct | undefined> {
  const index = serials.findIndex((s) => s.id === id);
  if (index === -1) return undefined;
  const updated: SerializedProduct = {
    ...serials[index],
    status,
    notes: notes ?? serials[index].notes,
    lastScanDate: new Date().toISOString(),
  };
  serials = [...serials.slice(0, index), updated, ...serials.slice(index + 1)];
  return updated;
}