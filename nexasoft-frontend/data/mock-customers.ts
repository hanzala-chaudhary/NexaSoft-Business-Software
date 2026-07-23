import type { Customer, CustomerPurchaseRecord } from "@/types/customer";

export const mockCustomers: Customer[] = [
  { id: "CUST-1", name: "Amina Rauf", phone: "0300-1234567", email: "amina.rauf@example.com", address: "House 12, Street 4, Lahore", notes: "", createdAt: "2025-11-02T09:00:00.000Z" },
  { id: "CUST-2", name: "Hamza Tariq", phone: "0321-9876543", email: "hamza.tariq@example.com", address: "Flat 3B, Gulberg, Lahore", notes: "", createdAt: "2025-11-15T09:00:00.000Z" },
  { id: "CUST-3", name: "Sara Iqbal", phone: "0333-4455667", email: "sara.iqbal@example.com", address: "DHA Phase 5, Lahore", notes: "Prefers cash payments", createdAt: "2025-12-01T09:00:00.000Z" },
  { id: "CUST-4", name: "Bilal Ahmed", phone: "0345-7788990", email: "bilal.ahmed@example.com", address: "Model Town, Lahore", notes: "", createdAt: "2025-12-20T09:00:00.000Z" },
  { id: "CUST-5", name: "Mehak Noor", phone: "0301-2233445", email: "mehak.noor@example.com", address: "Johar Town, Lahore", notes: "Bulk buyer for office setup", createdAt: "2026-01-10T09:00:00.000Z" },
  { id: "CUST-6", name: "Usman Khalid", phone: "0312-5566778", email: "usman.khalid@example.com", address: "Faisal Town, Lahore", notes: "", createdAt: "2026-02-05T09:00:00.000Z" },
];

export const mockCustomerPurchaseHistory: Record<string, CustomerPurchaseRecord[]> = {
  "CUST-1": [
    { id: "INV-2041", invoiceNumber: "INV-2041", date: "2026-07-18T10:24:00.000Z", itemCount: 3, total: 128.5, status: "Paid" },
    { id: "INV-1988", invoiceNumber: "INV-1988", date: "2026-06-02T11:10:00.000Z", itemCount: 1, total: 55.0, status: "Paid" },
  ],
  "CUST-2": [
    { id: "INV-2040", invoiceNumber: "INV-2040", date: "2026-07-18T09:58:00.000Z", itemCount: 1, total: 42.0, status: "Paid" },
  ],
  "CUST-3": [
    { id: "INV-2039", invoiceNumber: "INV-2039", date: "2026-07-18T09:41:00.000Z", itemCount: 5, total: 310.75, status: "Pending" },
    { id: "INV-1902", invoiceNumber: "INV-1902", date: "2026-05-14T14:00:00.000Z", itemCount: 2, total: 89.0, status: "Paid" },
  ],
  "CUST-4": [
    { id: "INV-2038", invoiceNumber: "INV-2038", date: "2026-07-18T09:15:00.000Z", itemCount: 2, total: 76.2, status: "Paid" },
  ],
  "CUST-5": [
    { id: "INV-2037", invoiceNumber: "INV-2037", date: "2026-07-18T08:52:00.000Z", itemCount: 4, total: 198.0, status: "Refunded" as CustomerPurchaseRecord["status"] },
    { id: "INV-1850", invoiceNumber: "INV-1850", date: "2026-04-22T16:30:00.000Z", itemCount: 8, total: 620.0, status: "Paid" },
  ],
  "CUST-6": [],
};