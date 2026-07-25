"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, ShoppingCart, Loader2, ListPlus } from "lucide-react";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New Purchase State
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<any[]>([]);

  // Fetch Initial Data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        fetch("https://nexa-soft-business-software--nexasoft.replit.app/purchases"),
        fetch("https://nexa-soft-business-software--nexasoft.replit.app/suppliers"),
        fetch("https://nexa-soft-business-software--nexasoft.replit.app/products"),
      ]);

      setPurchases(await purchasesRes.json());
      setSuppliers(await suppliersRes.json());
      setProducts(await productsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add Item Row
  const addItemRow = () => {
    setItems([...items, { productId: "", quantity: 1, costPrice: 0, serialNumbersText: "" }]);
  };

  // Update Item Row
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill cost price when product is selected
    if (field === "productId") {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].costPrice = selectedProduct.purchasePrice || 0;
      }
    }
    
    setItems(newItems);
  };

  // Remove Item Row
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate Total
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.costPrice)), 0);

  // Handle Save Purchase (BUG FIXED VERSION)
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert("Please select a supplier!");
    if (items.length === 0) return alert("Please add at least one product!");

    try {
      setIsSaving(true);

      // 1. Strict Validation: Check quantity vs serial numbers before saving
      for (const item of items) {
        const serials = item.serialNumbersText
          .split('\n')
          .map((s: string) => s.trim())
          .filter((s: string) => s !== "");
        
        // Agar serial number dale hain, toh quantity ke barabar hone chahiye
        if (serials.length > 0 && serials.length !== Number(item.quantity)) {
          setIsSaving(false);
          return alert(`Masla: Product ki quantity ${item.quantity} hai, par aap ne ${serials.length} serial numbers dale hain!\n\nYa toh quantity theek karein ya utne hi serials dalein.`);
        }
      }

      // 2. Format Data for Database
      const formattedItems = items.map(item => {
        const serials = item.serialNumbersText
          .split('\n')
          .map((s: string) => s.trim())
          .filter((s: string) => s !== "");
        
        return {
          productId: item.productId,
          quantity: Number(item.quantity),
          costPrice: Number(item.costPrice),
          serialNumbers: serials
        };
      });

      // 3. Save to Database
      const res = await fetch("https://nexa-soft-business-software--nexasoft.replit.app/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          totalAmount,
          paymentStatus: "PAID",
          items: formattedItems
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      await fetchData();
      setIsDialogOpen(false);
      setSupplierId("");
      setItems([]);
      alert("Purchase Successfully Saved! Stock and Serial Numbers updated.");
    } catch (error: any) {
      alert(error.message || "Error saving purchase!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Invoices</h1>
          <p className="text-sm text-slate-500">Record new stock purchases and scan serial numbers.</p>
        </div>

        {/* ─── Add Purchase Dialog ─── */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                {/* Supplier Selection */}
                <div className="space-y-2">
                  <Label>Select Supplier <span className="text-red-500">*</span></Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Items List */}
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
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (Stock: {p.opening_stock})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Quantity</Label>
                          <Input 
                            type="number" min="1" 
                            value={item.quantity} 
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

                      {/* Serial Numbers Box */}
                      <div className="space-y-1">
                        <Label className="text-xs text-indigo-600 font-semibold">
                          Serial Numbers (Paste here, one serial per line) - Total Required: {item.quantity}
                        </Label>
                        <textarea 
                          className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm min-h-[80px]"
                          placeholder="S/N-12345&#10;S/N-67890"
                          value={item.serialNumbersText}
                          onChange={(e) => updateItem(index, "serialNumbersText", e.target.value)}
                        />
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

                {/* Total */}
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

      {/* ─── Purchases List Table ─── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading purchases...
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No purchase invoices found. Add your first stock!
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.invoice_number}</TableCell>
                    <TableCell>{p.supplier?.name} {p.supplier?.company && `(${p.supplier?.company})`}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-bold text-indigo-600">Rs. {Number(p.total_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        {p.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}