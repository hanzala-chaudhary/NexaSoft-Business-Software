export type PaymentStatus = "Paid" | "Partial" | "Pending";

export interface Supplier {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  hasSerial: boolean;
}

export interface PurchaseItem {
  rowId: string;
  productId: string;
  productName: string;
  hasSerial: boolean;
  quantity: number;
  costPrice: number;
  total: number;
  serials: string[];
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  grandTotal: number;
  items: PurchaseItem[];
}

export interface PurchaseFormValues {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber: string;
  notes: string;
  paymentStatus: PaymentStatus;
  items: PurchaseItem[];
}