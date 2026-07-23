import type { Product, Supplier, Purchase } from "@/types/purchase";

export const mockProducts: Product[] = [
  { id: "PROD-1", name: "Wireless Mechanical Keyboard", hasSerial: true },
  { id: "PROD-2", name: "Optical Mouse", hasSerial: false },
  { id: "PROD-3", name: "1TB NVMe SSD", hasSerial: true },
];

export const mockSuppliers: Supplier[] = [
  { id: "SUP-1", name: "Tech Source Dist." },
  { id: "SUP-2", name: "Global Hardware Inc." },
];

export const mockPurchases: Purchase[] = [];