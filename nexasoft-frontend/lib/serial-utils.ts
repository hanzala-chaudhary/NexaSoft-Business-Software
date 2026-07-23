import type { SerializedProduct, SerialStatus, SerialHistoryEvent } from "@/types/serial";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isWarrantyActive(item: SerializedProduct) {
  return new Date(item.warrantyEndDate) > new Date();
}

export const SERIAL_STATUS_LABELS: Record<SerialStatus, string> = {
  "In Stock": "In Stock",
  Sold: "Sold",
  Returned: "Returned",
  "RMA Raised": "RMA Raised",
  Reserved: "Reserved",
  Damaged: "Damaged",
};

export const SERIAL_STATUS_STYLES: Record<SerialStatus, string> = {
  "In Stock": "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-transparent",
  Sold: "bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-transparent",
  Returned: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-transparent",
  "RMA Raised": "bg-purple-100 text-purple-800 hover:bg-purple-100/80 border-transparent",
  Reserved: "bg-slate-100 text-slate-800 hover:bg-slate-100/80 border-transparent",
  Damaged: "bg-rose-100 text-rose-800 hover:bg-rose-100/80 border-transparent",
};

export function buildSerialHistory(item: SerializedProduct): SerialHistoryEvent[] {
  const events: SerialHistoryEvent[] = [];
  events.push({
    id: "evt-1",
    label: "Added to Inventory",
    date: item.purchaseDate,
    description: `Purchased from ${item.supplierName}`,
  });
  if (item.saleDate) {
    events.push({
      id: "evt-2",
      label: "Sold",
      date: item.saleDate,
      description: item.customerName ? `Sold to ${item.customerName}` : "Sold to Walk-in Customer",
    });
  }
  return events;
}

export function matchesSerialQuery(item: SerializedProduct, query: string): boolean {
  const q = query.toLowerCase();
  return (
    item.serialNumber.toLowerCase().includes(q) ||
    item.productName.toLowerCase().includes(q) ||
    (item.barcode ?? "").toLowerCase().includes(q)
  );
}