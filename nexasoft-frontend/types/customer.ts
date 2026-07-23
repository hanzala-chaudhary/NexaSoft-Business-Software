export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerPurchaseRecord {
  id: string;
  invoiceNumber: string;
  date: string;
  itemCount: number;
  total: number;
  status: "Paid" | "Pending" | "Refunded" | "Cancelled";
}