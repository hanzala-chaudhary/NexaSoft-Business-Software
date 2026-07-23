export type SerialStatus = 
  | "In Stock" 
  | "Sold" 
  | "Returned" 
  | "RMA Raised" 
  | "Reserved" 
  | "Damaged";

export interface SerializedProduct {
  id: string;
  productName: string;
  brand: string;
  category: string;
  status: SerialStatus;
  serialNumber: string;
  barcode?: string;
  sku: string;
  purchasePrice: number;
  salePrice: number;
  supplierName: string;
  customerName?: string | null;
  purchaseDate: string;
  saleDate?: string | null;
  warrantyEndDate: string;
  manufacturerSerial?: string;
  internalTrackingNo?: string;
  notes?: string;
  lastScanDate?: string;
}

export interface SerialHistoryEvent {
  id: string;
  label: string;
  date: string;
  description?: string;
}

export interface SerialLookupResult {
  found: boolean;
  query: string;
  item?: SerializedProduct;
  history?: SerialHistoryEvent[];
}