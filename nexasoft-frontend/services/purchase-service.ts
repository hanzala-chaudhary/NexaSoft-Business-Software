import type { Purchase, PurchaseFormValues } from "@/types/purchase";
import { calculateGrandTotal } from "@/lib/purchase-utils";
import { mockPurchases } from "@/data/mock-data";

let purchases: Purchase[] = [...mockPurchases];

export async function getPurchases(): Promise<Purchase[]> {
  return purchases;
}

export async function createPurchase(values: PurchaseFormValues, supplierName: string): Promise<Purchase> {
  const newPurchase: Purchase = {
    id: crypto.randomUUID(),
    purchaseNumber: `PUR-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierName,
    grandTotal: calculateGrandTotal(values.items),
    ...values,
  };
  purchases = [newPurchase, ...purchases];
  return newPurchase;
}

export async function updatePurchase(id: string, values: PurchaseFormValues, supplierName: string): Promise<Purchase | undefined> {
  const index = purchases.findIndex((p) => p.id === id);
  if (index === -1) return undefined;

  const updatedPurchase: Purchase = {
    ...purchases[index],
    ...values,
    supplierName,
    grandTotal: calculateGrandTotal(values.items),
  };
  purchases[index] = updatedPurchase;
  return updatedPurchase;
}