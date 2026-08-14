"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, ShoppingCart, Loader2, ListPlus, ScanLine, X, AlertCircle, CheckCircle2, Factory, Search, FileText, ChevronDown, Check, Eye, Package, Wallet } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

interface PurchaseItem {
  productId: string;
  productName?: string;
  quantity: number;
  costPrice: number;
  serialNumbers: string[];
  scanInput: string;
}

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"];

// Empty row factory — keeps a single source of truth for a "blank" item
const emptyItem = (): PurchaseItem => ({
  productId: "",
  productName: "",
  quantity: 1,
  costPrice: 0,
  serialNumbers: [],
  scanInput: "",
});

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

  // Payment capture state
  const [amountPaid, setAmountPaid] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Cloud Notifications
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" | "info" }>({ show: false, msg: "", type: "info" });

  // Quick Supplier State
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", company: "" });
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);

  // View Invoice State
  const [viewInvoice, setViewInvoice] = useState<any>(null);

  // Dropdown States for Products
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "info" }), 3500);
  };

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

      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Cloud Database Sync Failed!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Outside click handler for custom product dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FIX: addItemRow now uses the functional setState form, so it never
  // depends on a stale `items` snapshot — safe to call from anywhere,
  // including keyboard shortcuts, without losing previously added rows.
  const addItemRow = useCallback(() => {
    setItems((prev) => [emptyItem(), ...prev]);
    showToast('New Item row added. (Tip: Use F8 to quickly add rows)', "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pro Shortcuts — F2 save, F8 add row.
  // Ignored while typing inside inputs/selects/textareas EXCEPT F8 add-row,
  // so scanning/typing serials or product search doesn't get interrupted by F2.
  useEffect(() => {
    if (!isDialogOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);

      if (e.key === "F2") {
        e.preventDefault();
        document.getElementById("btn-save-purchase")?.click();
        return;
      }
      if (e.key === "F8") {
        e.preventDefault();
        addItemRow();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, addItemRow]);

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const newItems = [...prev];
      const target = { ...newItems[index] } as any;
      target[field] = value;

      if (field === "productId") {
        const selectedProduct = products.find((p) => p.id === value);
        if (selectedProduct) {
          target.costPrice = selectedProduct.purchasePrice || 0;
          target.productName = selectedProduct.name;
        }
      }

      newItems[index] = target;
      return newItems;
    });
  };

  // Bulk Scan & Comma/space-separated Serial Engine
  const handleScanKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const rawValue = items[index].scanInput.trim();
    if (!rawValue) return;

    // Support for bulk pasting from excel (comma or space separated)
    const newSerialsArray = rawValue.split(/[\s,]+/).filter(Boolean);

    setItems((prev) => {
      const newItems = [...prev];
      const currentSerials = new Set(newItems[index].serialNumbers);

      let addedCount = 0;
      let duplicateCount = 0;

      newSerialsArray.forEach((serial) => {
        if (currentSerials.has(serial)) {
          duplicateCount++;
        } else {
          currentSerials.add(serial);
          addedCount++;
        }
      });

      newItems[index] = {
        ...newItems[index],
        serialNumbers: Array.from(currentSerials),
        scanInput: "",
        quantity: currentSerials.size,
      };

      // Toasts fired after state update (outside setState updater ideally,
      // but kept simple here since counts are local to this closure)
      setTimeout(() => {
        if (addedCount > 0) showToast(`${addedCount} Serial(s) secured in batch.`, "success");
        if (duplicateCount > 0) showToast(`${duplicateCount} Duplicate Serial(s) ignored!`, "error");
      }, 0);

      return newItems;
    });
  };

  const removeSerial = (index: number, serial: string) => {
    setItems((prev) => {
      const newItems = [...prev];
      const updatedSerials = newItems[index].serialNumbers.filter((s) => s !== serial);
      newItems[index] = {
        ...newItems[index],
        serialNumbers: updatedSerials,
        quantity: updatedSerials.length > 0 ? updatedSerials.length : 1,
      };
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // On-the-fly Supplier Addition
  const handleQuickAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name) return;
    setIsSavingSupplier(true);
    try {
      const payload = {
        name: newSupplier.name.trim(),
        phone: newSupplier.phone.trim() || undefined,
        company: newSupplier.company.trim() || undefined,
      };
      const res = await fetch(`${API_URL}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add supplier");

      setSuppliers((prev) => [...prev, data]);
      setSupplierId(data.id);
      setIsQuickSupplierOpen(false);
      setNewSupplier({ name: "", phone: "", company: "" });
      showToast(`Supplier ${data.name} created securely!`, "success");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.costPrice), 0);
  const paidNum = Math.max(0, Number(amountPaid) || 0);
  const balanceAmount = Math.max(0, totalAmount - paidNum);
  const derivedPaymentStatus = totalAmount > 0 && paidNum >= totalAmount ? "PAID" : paidNum > 0 ? "PARTIAL" : "PENDING";

  // Cap amountPaid whenever EITHER value changes (previously only fired on totalAmount change)
  useEffect(() => {
    if (totalAmount > 0 && Number(amountPaid) > totalAmount) {
      setAmountPaid(String(totalAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, amountPaid]);

  const resetForm = () => {
    setSupplierId("");
    setItems([]);
    setAmountPaid("0");
    setPaymentMethod("CASH");
    setActiveDropdownIndex(null);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!supplierId) return setFormError("Supplier selection is strictly required!");
    if (items.length === 0) return setFormError("Cannot generate an empty stock invoice!");
    if (items.some((i) => !i.productId)) return setFormError("Invalid product mapping in one or more rows!");
    if (items.some((i) => Number(i.quantity) <= 0)) return setFormError("Quantity must be greater than zero in every row!");
    if (paidNum < 0) return setFormError("Paid amount logic error!");

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
          paidAmount: paidNum,
          paymentStatus: derivedPaymentStatus,
          paymentMethod,
          items: formattedItems,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Cloud Database Save failed");

      await fetchData();
      setIsDialogOpen(false);
      resetForm();
      showToast("Godam Stock Updated Successfully!", "success");
    } catch (error: any) {
      setFormError(error.message || "System encountered a secure block!");
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadgeClass = (status: string) => {
    if (status === "PAID") return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
    if (status === "PARTIAL") return "bg-amber-100 text-amber-800 border-amber-300 font-bold";
    return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
  };

  // Search filter for custom dropdown
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.master_barcode && p.master_barcode.includes(productSearch))
  );

  return (
    <div className="flex h-full flex-col gap-6 p-6 lg:p-8 bg-slate-50 relative overflow-y-auto">
      {/* GLOBAL TOAST NOTIFICATION */}
      <div className={`fixed top-6 right-6 z-[200] transition-all duration-300 transform ${toast.show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border-l-4 ${toast.type === "error" ? "bg-rose-900 border-rose-500 text-white" : toast.type === "info" ? "bg-indigo-900 border-indigo-500 text-white" : "bg-emerald-900 border-emerald-500 text-white"}`}>
          {toast.type === "error" ? <AlertCircle className="h-5 w-5" /> : toast.type === "info" ? <ListPlus className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <p className="font-semibold text-sm">{toast.msg}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Factory className="h-8 w-8 text-indigo-600" />
            Godam / Stock Entry
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2 shadow-sm font-bold">
              Inward Logs
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Register wholesale purchases, scan batch serials, and update physical ledgers.</p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open && items.length > 0 && !window.confirm("You have unsaved stock items. Are you sure you want to close?")) return;
            setIsDialogOpen(open);
            if (!open) setFormError("");
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 gap-2 font-bold shadow-md transition-all hover:scale-105">
              <Plus className="h-5 w-5" /> Execute New Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-y-auto bg-slate-50 p-0 border-0 shadow-2xl">
            <form onSubmit={handleSavePurchase} className="flex flex-col h-full">
              <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center sticky top-0 z-20">
                <div>
                  <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-indigo-400" /> Secure Stock Entry (Godam IN)
                  </DialogTitle>
                  <p className="text-slate-400 font-medium text-xs mt-1">
                    System verifies duplicate serials instantly. Press <kbd className="bg-slate-700 px-1 py-0.5 rounded">F2</kbd> to save or <kbd className="bg-slate-700 px-1 py-0.5 rounded">F8</kbd> to add item block.
                  </p>
                </div>
              </div>

              {/* CHANGED: breakpoint moved from lg -> md so the sidebar stacks
                  earlier on narrower/tablet widths instead of squishing */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Main Content Area (Items) */}
                <div className="md:col-span-3 space-y-6">
                  {formError && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 font-bold flex items-center gap-2 shadow-sm">
                      <AlertCircle className="h-5 w-5 text-rose-600" /> {formError}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <Label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Package className="h-5 w-5 text-indigo-500" /> Inward Consignment Items
                    </Label>
                    <Button type="button" onClick={addItemRow} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold">
                      <ListPlus className="h-4 w-4 mr-2" /> Add Next Item <span className="text-[10px] opacity-70 ml-1">(F8)</span>
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <Card key={index} className="p-0 bg-white border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 border-b border-slate-100">
                          {/* DYNAMIC SEARCHABLE PRODUCT DROPDOWN */}
                          <div className="md:col-span-6 space-y-1 relative" ref={activeDropdownIndex === index ? dropdownRef : null}>
                            <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                              Select Product <span className="text-rose-500">*</span>
                            </Label>
                            <div
                              onClick={() => {
                                setActiveDropdownIndex(index === activeDropdownIndex ? null : index);
                                setProductSearch("");
                              }}
                              className="flex items-center justify-between h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 font-bold"
                            >
                              <span className={item.productName ? "text-slate-900" : "text-slate-400"}>{item.productName || "-- Search by Name or Barcode --"}</span>
                              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${activeDropdownIndex === index ? "rotate-180" : ""}`} />
                            </div>

                            {activeDropdownIndex === index && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                                <div className="p-2 bg-slate-50 border-b border-slate-100 sticky top-0">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                      placeholder="Scan Barcode or Type Name..."
                                      className="pl-8 h-10 text-sm font-semibold focus-visible:ring-indigo-500 border-slate-300"
                                      value={productSearch}
                                      onChange={(e) => setProductSearch(e.target.value)}
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                  {filteredProducts.length > 0 ? (
                                    filteredProducts.map((p) => (
                                      <div
                                        key={p.id}
                                        onClick={() => {
                                          updateItem(index, "productId", p.id);
                                          setActiveDropdownIndex(null);
                                        }}
                                        className="px-3 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
                                      >
                                        <div className="flex flex-col">
                                          <span>{p.name}</span>
                                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{p.master_barcode ? `B/C: ${p.master_barcode}` : "No Barcode"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="bg-white">
                                            Stock: {p.opening_stock}
                                          </Badge>
                                          {item.productId === p.id && <Check className="h-4 w-4 text-indigo-600" />}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-3 py-6 text-center text-xs font-bold text-slate-400">No product match found.</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="md:col-span-3 space-y-1">
                            <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Cost / Unit (Rs)</Label>
                            <Input
                              type="number"
                              min="0"
                              className="h-11 border-slate-300 bg-white font-black text-slate-900 shadow-inner focus-visible:ring-indigo-500"
                              value={item.costPrice}
                              onChange={(e) => updateItem(index, "costPrice", e.target.value)}
                              required
                            />
                          </div>

                          <div className="md:col-span-2 space-y-1">
                            <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              className="h-11 border-slate-300 bg-white font-black text-center text-slate-900 shadow-inner focus-visible:ring-indigo-500"
                              value={item.quantity}
                              disabled={item.serialNumbers.length > 0}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              required
                            />
                          </div>

                          <div className="md:col-span-1 flex items-end justify-end pb-1">
                            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-100 rounded-lg" onClick={() => removeItem(index)} title="Remove Row">
                              <X className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>

                        {/* Scan Input Section */}
                        <div className="p-4 bg-white">
                          <Label className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                            <ScanLine className="h-4 w-4" /> Hardware Serial Input Engine
                          </Label>
                          <Input
                            placeholder="Point scanner here OR Paste bulk serials (comma/space separated) and hit Enter..."
                            value={item.scanInput}
                            onChange={(e) => updateItem(index, "scanInput", e.target.value)}
                            onKeyDown={(e) => handleScanKeyDown(index, e)}
                            className="h-12 bg-indigo-50/50 border-indigo-200 font-mono focus-visible:ring-indigo-500 shadow-inner"
                            autoComplete="off"
                          />
                          <p className="text-[10px] text-slate-400 font-medium mt-1 mb-3">Bulk pasting supported. System automatically identifies duplicates.</p>

                          {item.serialNumbers.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-inner max-h-[120px] overflow-y-auto custom-scrollbar">
                              <div className="w-full flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Secured Serials ({item.serialNumbers.length})</span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Qty Locked</span>
                              </div>
                              {item.serialNumbers.map((serial) => (
                                <span key={serial} className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 text-slate-800 shadow-sm px-2.5 py-1 text-[11px] font-mono font-bold transition-all hover:border-indigo-400">
                                  {serial}
                                  <button type="button" onClick={() => removeSerial(index, serial)} className="hover:text-rose-600 hover:bg-rose-50 rounded-full p-0.5 transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}

                    {items.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center gap-3">
                        <Package className="h-12 w-12 text-slate-300" />
                        <div>
                          <p className="font-bold text-slate-600 text-lg">No Items Added Yet</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Press <kbd className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-700">F8</kbd> or click "Add Next Item" to start logging inward stock.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar (Supplier & Payment) */}
                <div className="md:col-span-1 space-y-6">
                  {/* Supplier Card */}
                  <Card className="bg-white border-slate-200 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <Factory className="h-24 w-24" />
                    </div>
                    <CardHeader className="border-b bg-slate-50 pb-4 relative z-10">
                      <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-slate-700">Supplier Ledger</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 relative z-10">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Select Vendor <span className="text-rose-500">*</span>
                        </Label>
                        <select
                          className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
                          required
                        >
                          <option value="">-- Choose Vendor --</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.company ? `(${s.company})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {!isQuickSupplierOpen ? (
                        <Button type="button" variant="outline" className="w-full text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 font-bold text-xs shadow-sm h-9" onClick={() => setIsQuickSupplierOpen(true)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Quick Create New Vendor
                        </Button>
                      ) : (
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 space-y-3 animate-in fade-in zoom-in-95">
                          <Label className="text-[10px] font-black uppercase text-indigo-800">New Vendor Form</Label>
                          <Input className="h-9 text-xs font-semibold" placeholder="Vendor Name *" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} autoFocus />
                          <Input className="h-9 text-xs font-semibold" placeholder="Company (Optional)" value={newSupplier.company} onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })} />
                          <Input className="h-9 text-xs font-semibold" placeholder="Phone (Optional)" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" className="h-8 flex-1 text-[10px] hover:bg-indigo-100" onClick={() => setIsQuickSupplierOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="button" className="h-8 flex-1 text-[10px] bg-indigo-600 hover:bg-indigo-700" onClick={handleQuickAddSupplier} disabled={isSavingSupplier || !newSupplier.name}>
                              {isSavingSupplier ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Financial Summary Card */}
                  <Card className="bg-slate-900 border-slate-800 shadow-xl text-white">
                    <CardHeader className="border-b border-slate-800 pb-4">
                      <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Financials
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grand Total</span>
                        <span className="text-2xl font-black text-white">Rs. {totalAmount.toLocaleString()}</span>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Paid (Rs)</Label>
                        <Input
                          type="number"
                          min="0"
                          max={totalAmount}
                          className="h-12 border-slate-700 bg-slate-800 font-black text-xl text-white shadow-inner focus-visible:ring-emerald-500"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode</Label>
                        <select
                          className="flex h-11 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 text-white"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Debt / Udhaar</span>
                          <span className={`text-lg font-black ${balanceAmount > 0 ? "text-rose-400" : "text-emerald-400"}`}>Rs. {balanceAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-end mt-2">
                          <Badge variant="outline" className={`border-2 ${statusBadgeClass(derivedPaymentStatus)} bg-transparent`}>
                            {derivedPaymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button id="btn-save-purchase" type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg font-black shadow-xl hover:shadow-2xl transition-transform hover:-translate-y-1 gap-2" disabled={isSaving || items.length === 0}>
                    {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                    COMMIT STOCK <span className="text-[10px] ml-1 bg-emerald-800 px-2 py-0.5 rounded opacity-80">[F2]</span>
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Invoice #</TableHead>
                <TableHead className="font-bold text-slate-700">Vendor Identity</TableHead>
                <TableHead className="font-bold text-slate-700">Date Logged</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Total Value</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Paid Amount</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Pending Debt</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-500" />
                    Fetching cloud ledgers...
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                    <Factory className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    No inward consignments found. Create your first godam entry.
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((p) => {
                  const total = Number(p.total_amount ?? 0);
                  const paid = Number(p.paid_amount ?? 0);
                  const balance = Math.max(0, total - paid);
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-mono font-bold text-slate-900">{p.invoice_number}</TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {p.supplier?.name} {p.supplier?.company && <span className="text-xs text-slate-500 block">({p.supplier.company})</span>}
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">{new Date(p.created_at).toLocaleString("ur-PK", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                      <TableCell className="text-right font-black text-indigo-700 text-lg">Rs. {total.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-700">Rs. {paid.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{balance > 0 ? <span className="font-bold text-rose-600">Rs. {balance.toLocaleString()}</span> : <span className="text-slate-300">-</span>}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={statusBadgeClass(p.payment_status)}>
                          {p.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" className="h-8 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-200" onClick={() => setViewInvoice(p)}>
                          <Eye className="h-4 w-4 mr-1.5" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOG: View Invoice Details */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-slate-50">
          {viewInvoice && (
            <>
              <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-400" /> Invoice: <span className="font-mono">{viewInvoice.invoice_number}</span>
                </DialogTitle>
                <Badge className={statusBadgeClass(viewInvoice.payment_status)}>{viewInvoice.payment_status}</Badge>
              </div>
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vendor Details</Label>
                    <p className="font-black text-lg text-slate-800">{viewInvoice.supplier?.name}</p>
                    {viewInvoice.supplier?.company && <p className="text-sm font-semibold text-slate-600">{viewInvoice.supplier.company}</p>}
                    {viewInvoice.supplier?.phone && <p className="text-sm text-slate-500 mt-1">{viewInvoice.supplier.phone}</p>}
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Financial summary</Label>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-600">Grand Total:</span>
                      <span className="font-black text-slate-900">Rs. {Number(viewInvoice.total_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-600">Amount Paid:</span>
                      <span className="font-bold text-emerald-600">Rs. {Number(viewInvoice.paid_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-1 mt-1">
                      <span className="text-sm font-bold text-slate-600">Debt Balance:</span>
                      <span className="font-black text-rose-600">Rs. {Math.max(0, Number(viewInvoice.total_amount) - Number(viewInvoice.paid_amount)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Procured Items ({viewInvoice.items?.length || 0})</Label>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {viewInvoice.items?.map((item: any) => (
                      <div key={item.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-extrabold text-slate-800">{item.products?.name}</p>
                            <p className="text-xs font-bold text-slate-500 mt-0.5">
                              {item.quantity} Units × Rs. {Number(item.cost_price).toLocaleString()}
                            </p>
                          </div>
                          <p className="font-black text-indigo-700">Rs. {(item.quantity * Number(item.cost_price)).toLocaleString()}</p>
                        </div>

                        {item.purchase_serials && item.purchase_serials.length > 0 && (
                          <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Registered Hardware Serials</p>
                            <div className="flex flex-wrap gap-1.5">
                              {item.purchase_serials.map((serialObj: any) => (
                                <span key={serialObj.serial_number} className="inline-flex items-center rounded-md bg-white border border-slate-300 text-slate-800 shadow-sm px-2 py-0.5 text-[10px] font-mono font-bold">
                                  {serialObj.serial_number}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end">
                <Button className="font-bold bg-slate-800 hover:bg-slate-900 shadow-md" onClick={() => setViewInvoice(null)}>
                  Close Viewer
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `,
        }}
      />
    </div>
  );
}