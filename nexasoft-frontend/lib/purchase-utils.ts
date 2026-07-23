import type { PurchaseItem, PaymentStatus } from "@/types/purchase";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export const paymentStatusStyles: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-100 text-emerald-800 border-transparent",
  Partial: "bg-amber-100 text-amber-800 border-transparent",
  Pending: "bg-slate-100 text-slate-800 border-transparent",
};

export function calculateItemTotal(quantity: number, costPrice: number) {
  return quantity * costPrice;
}

export function calculateGrandTotal(items: PurchaseItem[]) {
  return items.reduce((sum, item) => sum + item.total, 0);
}

export function createEmptyItem(): PurchaseItem {
  return {
    rowId: crypto.randomUUID(),
    productId: "",
    productName: "",
    hasSerial: false,
    quantity: 0,
    costPrice: 0,
    total: 0,
    serials: [],
  };
}

export function validateSerials(items: PurchaseItem[]): string | null {
  for (const item of items) {
    if (item.hasSerial) {
      if (item.serials.length !== item.quantity) {
        return `Product ${item.productName} requires exactly ${item.quantity} serial number(s).`;
      }
      if (item.serials.some(s => !s.trim())) {
        return `Serial numbers for ${item.productName} cannot be empty.`;
      }
    }
  }
  return null;
}