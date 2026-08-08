"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, ShoppingCart, Loader2, ListPlus, ScanLine, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface PurchaseItem {
  productId: string;
  quantity: number;
  costPrice: number;
  serialNumbers: string[];
  scanInput: string;
}

// Sales checkout jaisa hi payment method set — yahan bhi wahi rakha hai taake dono jagah consistent rahe
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // NEW: payment capture state
  const [amountPaid, setAmountPaid] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/purchases`),
        fetch(`${API_URL}/suppliers`),
        fetch(`${API_URL}/products`),
      ]);

      const purchasesData = purchasesRes.ok ? await purchasesRes.json() : [];
      const suppliersData = suppliersRes.ok ? await suppliersRes.json() : [];
      const productsData = productsRes.ok ? await productsRes.json() : [];

      // Defensive check — agar backend ne kisi wajah se array na bheja (error object waghera),
      // to crash hone ki bajaye khali array use karo
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);

      if (!Array.isArray(suppliersData)) {
        console.warn("Suppliers data array nahi thi:", suppliersData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItemRow = () => {
    setItems([...items, { productId: "", quantity: 1, costPrice: 0, serialNumbers: [], scanInput: "" }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    // Product select hote hi uski last-known purchase price auto-fill kar do
    if (field === "productId") {
      const selectedProduct = products.find((p) => p.id === value);
      if (selectedProduct) {
        newItems[index].costPrice = selectedProduct.purchasePrice || 0;
      }
    }

    setItems(newItems);
  };

  // Scan input mein Enter dabate hi serial list mein add ho jata hai
  const handleScanKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = items[index].scanInput.trim();
    if (!value) return;

    if (items[index].serialNumbers.includes(value)) {
      alert(`"${value}" pehle hi is item mein scan ho chuka hai!`);
      return;
    }

    const newItems = [...items];
    newItems[index].serialNumbers = [...newItems[index].serialNumbers, value];
    newItems[index].scanInput = "";
    // Quantity hamesha scanned serials ki ginti ke barabar rakhte hain
    newItems[index].quantity = newItems[index].serialNumbers.length;
    setItems(newItems);
  };

  const removeSerial = (index: number, serial: string) => {
    const newItems = [...items];
    newItems[index].serialNumbers = newItems[index].serialNumbers.filter((s) => s !== serial);
    if (newItems[index].serialNumbers.length > 0) {
      newItems[index].quantity = newItems[index].serialNumbers.length;
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.costPrice), 0);

  // NEW: derived payment numbers — sales checkout ki tarah hi balance/status nikalte hain
  const paidNum = Math.max(0, Number(amountPaid) || 0);
  const balanceAmount = Math.max(0, totalAmount - paidNum);
  const derivedPaymentStatus =
    totalAmount > 0 && paidNum >= totalAmount ? "PAID" : paidNum > 0 ? "PARTIAL" : "PENDING";

  // Jab total badle (item add/remove/qty/price) aur paid amount total se zyada ho jaye,
  // usay total tak clamp kar do taake overpaid na dikhe
  useEffect(() => {
    if (Number(amountPaid) > totalAmount && totalAmount > 0) {
      setAmountPaid(String(totalAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount]);

  const resetForm = () => {
    setSupplierId("");
    setItems([]);
    setAmountPaid("0");
    setPaymentMethod("CASH");
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!supplierId) return setFormError("Supplier select karna zaroori hai!");
    if (items.length === 0) return setFormError("Kam se kam ek product add karein!");
    if (items.some((i) => !i.productId)) return setFormError("Har item ka product select karna zaroori hai!");
    if (paidNum < 0) return setFormError("Paid amount negative nahi ho sakta!");
    if (paidNum > totalAmount) return setFormError("Paid amount total se zyada nahi ho sakta!");

    try {
      setIsSaving(true);

      const formattedItems = items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        costPrice: Number(item.costPrice),
        serialNumbers: item.serialNumbers,
      }));

      const res = await fetch(`${API_URL}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          totalAmount,
          // FIX: pehle "PAID" hardcoded tha aur paidAmount bheja hi nahi jata tha,
          // is wajah se backend hamesha purchase ko PENDING/0-paid maan leta tha.
          paidAmount: paidNum,
          paymentStatus: derivedPaymentStatus,
          paymentMethod,
          items: formattedItems,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Save failed");

      await fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      setFormError(error.message || "Error saving purchase!");
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadgeClass = (status: string) => {
    if (status === "PAID") return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
    if (status === "PARTIAL") return "bg-amber-100 text-amber-800 hover:bg-amber-100";
    return "bg-rose-100 text-rose-800 hover:bg-rose-100";
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Invoices</h1>
          <p className="text-sm text-slate-500">Record new stock purchases — barcode scanner se serial numbers scan karein.</p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(""); }}
        >
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> New Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSavePurchase}>
              <DialogHeader>
                <DialogTitle>Create Purchase Invoice</DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-6">
                {formError && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>
                )}

                <div className="space-y-2">
                  <Label>Select Supplier <span className="text-red-500">*</span></Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ""}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Products & Serial Numbers</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                      <ListPlus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </div>

                  {items.map((item, index) => (
                    <Card key={index} className="p-4 bg-slate-50 border-dashed">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-2 space-y-1">
                          <Label>Product</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                            value={item.productId}
                            onChange={(e) => updateItem(index, "productId", e.target.value)}
                            required
                          >
                            <option value="">-- Select Product --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} (Stock: {p.opening_stock})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Quantity {item.serialNumbers.length > 0 && <span className="text-xs text-indigo-600">(scan se auto)</span>}</Label>
                          <Input
                            type="number" min="1"
                            value={item.quantity}
                            disabled={item.serialNumbers.length > 0}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Unit Cost (Rs)</Label>
                          <Input
                            type="number" min="0"
                            value={item.costPrice}
                            onChange={(e) => updateItem(index, "costPrice", e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Scan-based serial input — textarea ki jagah */}
                      <div className="space-y-2">
                        <Label className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5">
                          <ScanLine className="h-3.5 w-3.5" />
                          Serial Number scan karein aur Enter dabayein
                        </Label>
                        <Input
                          placeholder="Scanner yahan point karein... (ya hath se likh ke Enter dabayein)"
                          value={item.scanInput}
                          onChange={(e) => updateItem(index, "scanInput", e.target.value)}
                          onKeyDown={(e) => handleScanKeyDown(index, e)}
                          className="bg-white"
                          autoComplete="off"
                        />

                        {item.serialNumbers.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {item.serialNumbers.map((serial) => (
                              <span
                                key={serial}
                                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-mono"
                              >
                                {serial}
                                <button
                                  type="button"
                                  onClick={() => removeSerial(index, serial)}
                                  className="hover:text-rose-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end mt-2">
                        <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(index)}>
                          Remove Item
                        </Button>
                      </div>
                    </Card>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-slate-400">
                      No products added yet. Click "Add Item".
                    </div>
                  )}
                </div>

                {/* NEW: Payment capture — sales checkout jaisa hi */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-lg font-semibold">Payment</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Amount Paid (Rs)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={totalAmount}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Payment Method</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Balance (Rs)</Label>
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-slate-100 px-3 text-sm font-semibold text-rose-600">
                        Rs. {balanceAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Badge className={statusBadgeClass(derivedPaymentStatus)}>{derivedPaymentStatus}</Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <h3 className="text-xl font-bold">Grand Total:</h3>
                  <h3 className="text-2xl font-bold text-indigo-600">Rs. {totalAmount.toLocaleString()}</h3>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600" disabled={isSaving || items.length === 0}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                  Save Invoice
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading purchases...
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No purchase invoices found. Add your first stock!
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((p) => {
                  const total = Number(p.total_amount ?? 0);
                  const paid = Number(p.paid_amount ?? 0);
                  const balance = Math.max(0, total - paid);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.invoice_number}</TableCell>
                      <TableCell>{p.supplier?.name} {p.supplier?.company && `(${p.supplier?.company})`}</TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">Rs. {total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-slate-700">Rs. {paid.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {balance > 0 ? (
                          <span className="font-semibold text-rose-600">Rs. {balance.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(p.payment_status)}>{p.payment_status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}