"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, Package, Trash2, Pencil, Loader2,
  ChevronDown, ChevronRight, Barcode, Printer, Tag, FileText, User, ShoppingCart
} from "lucide-react";

// Yahan maine explicitly live link daal diya hai taake local aur live ka masla hi na rahe.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

const emptyForm = { name: "", salePrice: "", purchasePrice: "", barcode: "", stock: "", categoryId: "", isSerialized: false };

const serialStatusStyle: Record<string, string> = {
  IN_STOCK: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SOLD: "bg-indigo-100 text-indigo-700 border-indigo-200",
  RESERVED: "bg-amber-100 text-amber-700 border-amber-200",
  RETURNED: "bg-slate-200 text-slate-700 border-slate-300",
  IN_REPAIR: "bg-purple-100 text-purple-700 border-purple-200",
  DAMAGED: "bg-rose-100 text-rose-700 border-rose-200",
  LOST: "bg-rose-100 text-rose-700 border-rose-200",
  RMA: "bg-rose-100 text-rose-700 border-rose-200",
};

function mapRow(p: any) {
  return {
    id: p.id,
    name: p.name,
    salePrice: Number(p.salePrice),
    purchasePrice: Number(p.purchasePrice) || 0,
    barcode: p.master_barcode || "-",
    stock: Number(p.opening_stock) || 0,
    categoryId: p.categoryId || "",
    categoryName: p.category?.name || null,
    brandName: p.brand?.name || null,
    isSerialized: p.is_serialized || false,
    matchedSerials: p.matchedSerials || [],
  };
}

export default function ProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printProduct, setPrintProduct] = useState<any>(null);
  const [printQuantity, setPrintQuantity] = useState(1);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [serialsMap, setSerialsMap] = useState<Record<string, { serial_number: string }[]>>({});
  const [loadingSerials, setLoadingSerials] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchAllProducts();
    fetchCategories();
  }, []);

  const fetchAllProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setRows(data.map(mapRow));
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      if (res.ok) setCategories(await res.json());
    } catch (error) {
      console.error("Categories Fetch Error:", error);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      fetchAllProducts();
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setRows(data.map(mapRow));
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  async function toggleExpand(productId: string) {
    if (expandedId === productId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(productId);

    if (!serialsMap[productId]) {
      try {
        setLoadingSerials(productId);
        const res = await fetch(`${API_URL}/serial/product/${productId}`);
        const data = await res.json();
        setSerialsMap((prev) => ({ ...prev, [productId]: data }));
      } catch (error) {
        console.error("Serials fetch error:", error);
      } finally {
        setLoadingSerials(null);
      }
    }
  }

  async function openSerialDetail(serialNumber: string) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const res = await fetch(`${API_URL}/serial/${encodeURIComponent(serialNumber)}`);
      const data = await res.json();
      setDetailData(res.ok ? data : null);
    } catch (error) {
      console.error("Serial detail error:", error);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function openAddDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setIsDialogOpen(true);
  }

  function openEditDialog(row: any) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      salePrice: String(row.salePrice),
      purchasePrice: String(row.purchasePrice),
      barcode: row.barcode === "-" ? "" : row.barcode,
      stock: String(row.stock),
      categoryId: row.categoryId || "",
      isSerialized: row.isSerialized || false,
    });
    setFormError("");
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name || !form.salePrice || !form.purchasePrice) {
      setFormError("Naam, Sale Price, aur Purchase Price teeno zaroori hain!");
      return;
    }

    const isEdit = editingId !== null;

    try {
      setIsSaving(true);
      const payload = {
        name: form.name,
        salePrice: Number(form.salePrice),
        purchasePrice: Number(form.purchasePrice),
        masterBarcode: form.barcode || undefined,
        openingStock: Number(form.stock) || 0,
        categoryId: form.categoryId || undefined,
        isSerialized: form.isSerialized,
      };

      const res = await fetch(
        isEdit ? `${API_URL}/products/${editingId}` : `${API_URL}/products`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Product ${isEdit ? "update" : "save"} nahi ho saka!`);

      await fetchAllProducts();
      setIsDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Kya aap waqai is product ko delete karna chahte hain?")) return;
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete product");
      setRows(rows.filter((r) => r.id !== id));
    } catch (error: any) {
      alert(error.message);
    }
  }

  const openPrintModal = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.isSerialized) {
      alert("Ye serialized product hai — iske liye alag se Serial Number labels chahiye honge, master barcode print nahi hota.");
      return;
    }
    if (!product.barcode || product.barcode === "-") {
      alert("Is product ka koi Barcode nahi hai! Pehle edit karke barcode add karein.");
      return;
    }
    setPrintProduct(product);
    setPrintQuantity(1);
    setIsPrintModalOpen(true);
  };

  const handlePrintBarcodes = () => {
    if (!printProduct || printQuantity <= 0) return;

    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(printProduct.barcode)}&scale=3&height=10&includetext`;

    let stickersHtml = '';
    for (let i = 0; i < printQuantity; i++) {
      stickersHtml += `
        <div class="sticker">
          <div class="shop-name">Tayyab & Hassan</div>
          <div class="product-name">${printProduct.name.substring(0, 25)}</div>
          <img src="${barcodeUrl}" class="barcode-img" />
          <div class="price">Rs. ${Number(printProduct.salePrice).toLocaleString()}</div>
        </div>
      `;
    }

    const printHtml = `
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            @page { size: 50mm 25mm; margin: 0; }
            body { margin: 0; padding: 0; background: #fff; display: flex; flex-direction: column; align-items: center; }
            .sticker { 
              width: 50mm; height: 25mm; 
              display: flex; flex-direction: column; justify-content: center; align-items: center;
              box-sizing: border-box; padding: 2px;
              page-break-after: always;
              text-align: center; font-family: sans-serif;
            }
            .shop-name { font-size: 8px; font-weight: bold; }
            .product-name { font-size: 9px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95%; }
            .barcode-img { max-width: 90%; height: 10mm; }
            .price { font-size: 10px; font-weight: bold; margin-top: 1px; }
          </style>
        </head>
        <body>${stickersHtml}</body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=400,height=400");
    if (!printWindow) {
      alert("Popup blocked! Please allow popups for printing.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      setIsPrintModalOpen(false);
    }, 1000);
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Products & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Naam, Barcode ya Serial Number scan karein. Row par click karke details dekhein.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold shadow-sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4" /> Add New Product
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b bg-transparent pb-4">
          <div className="relative flex-1 max-w-xl">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            )}
            <Input
              placeholder="Naam, Barcode ya Serial Number yahan scan karein..."
              className="pl-9 bg-slate-50 border-slate-200 text-base h-11 focus-visible:ring-indigo-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[60px]">Icon</TableHead>
                <TableHead className="font-bold text-slate-600">Product</TableHead>
                <TableHead className="font-bold text-slate-600">Type</TableHead>
                <TableHead className="font-bold text-slate-600">Barcode</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Purchase</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Sale Price</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Margin</TableHead>
                <TableHead className="text-center font-bold text-slate-600">Stock</TableHead>
                <TableHead className="w-[140px] text-center font-bold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="h-32 text-center text-slate-400"><Package className="h-10 w-10 mx-auto mb-2 opacity-20" />No products found.</TableCell></TableRow>
              ) : (
                rows.map((row) => {
                  const margin = row.salePrice - row.purchasePrice;
                  const isExpanded = expandedId === row.id;
                  const hasSearchMatch = searchQuery.trim() && row.matchedSerials.length > 0;

                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className={`cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => toggleExpand(row.id)}>
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 border border-indigo-100">
                            <Tag className="h-5 w-5 text-indigo-500" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-slate-800 line-clamp-1">{row.name}</p>
                          {(row.categoryName || row.brandName) && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {[row.brandName, row.categoryName].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.isSerialized ? (
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Serialized</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500">Bulk/Barcode</Badge>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="font-mono text-slate-600 bg-white shadow-sm">{row.barcode}</Badge></TableCell>
                        <TableCell className="text-right text-slate-500 font-medium">Rs. {row.purchasePrice.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-black text-slate-900">Rs. {row.salePrice.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-bold ${margin < 0 ? "text-rose-600" : "text-emerald-600"}`}>Rs. {margin.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="shadow-sm" variant={row.stock < 5 ? "destructive" : "secondary"}>{row.stock}</Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50" onClick={(e) => openPrintModal(row, e)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-indigo-500 hover:bg-indigo-50" onClick={() => openEditDialog(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(row.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {hasSearchMatch && (
                        <TableRow className="bg-emerald-50/50">
                          <TableCell colSpan={10} className="px-6 py-3 border-l-4 border-l-emerald-500">
                            <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wider flex items-center gap-1">
                              <Barcode className="h-3 w-3" /> Serial Match Found (Click to view history)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {row.matchedSerials.map((s: any) => (
                                <button
                                  key={s.serial_number}
                                  onClick={() => openSerialDetail(s.serial_number)}
                                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-bold shadow-sm transition-transform hover:scale-105 border ${serialStatusStyle[s.status] || "bg-white text-slate-700 border-slate-200"}`}
                                >
                                  {s.serial_number} — {s.status.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {isExpanded && (
                        <TableRow className="bg-slate-50 border-b-2 border-b-slate-200">
                          <TableCell colSpan={10} className="px-6 py-4 border-l-4 border-l-indigo-400 shadow-inner">
                            {loadingSerials === row.id ? (
                              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-500">
                                <Loader2 className="h-4 w-4 animate-spin" /> Fetching serials...
                              </div>
                            ) : (serialsMap[row.id]?.length ?? 0) === 0 ? (
                              <p className="text-sm font-semibold text-slate-500 italic">No available serials in stock for this product.</p>
                            ) : (
                              <div>
                                <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">
                                  {serialsMap[row.id].length} Available Units (In Stock)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {serialsMap[row.id].map((s) => (
                                    <button
                                      key={s.serial_number}
                                      onClick={() => openSerialDetail(s.serial_number)}
                                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 shadow-sm px-3 py-1.5 text-xs font-mono font-semibold text-slate-700 transition-all hover:border-indigo-400 hover:text-indigo-700 hover:shadow"
                                    >
                                      <Barcode className="h-3 w-3 text-slate-400" />
                                      {s.serial_number}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl">{editingId ? "Edit Product Details" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {formError && <div className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 font-bold border border-rose-200">{formError}</div>}

              <div className="col-span-2 space-y-1.5">
                <Label>Product Name <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9 bg-white" placeholder="e.g. SSD 500GB Samsung" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>

              {/* Serialized Toggle */}
              <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-slate-800">Har unit ka alag Serial Number?</p>
                  <p className="text-xs text-slate-500">SSD, RAM, Hard Drive jaisi cheezon ke liye "Yes" — cables/accessories ke liye "No"</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isSerialized: !form.isSerialized })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.isSerialized ? "bg-indigo-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isSerialized ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {!form.isSerialized ? (
                <div className="col-span-2 space-y-1.5">
                  <Label>Master Barcode (optional)</Label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-9 bg-white" placeholder="Scan or Type" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="col-span-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700 border border-indigo-100">
                  Ye serialized product hai — Master Barcode ki zaroorat nahi. Purchase ke waqt har unit ka Serial Number scan karke uski identity banegi.
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Category</Label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                  value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>{editingId ? "Current Stock" : "Initial Stock"}</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label>Purchase Price (PKR) <span className="text-rose-500">*</span></Label>
                <Input type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <Label>Sale Price (PKR) <span className="text-rose-500">*</span></Label>
                <Input type="number" step="0.01" min="0" className="font-bold text-emerald-600" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required />
              </div>

              {form.purchasePrice && form.salePrice && (
                <div className="col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 border border-emerald-100 flex justify-between">
                  <span>Estimated Profit per Unit:</span>
                  <span>Rs. {(Number(form.salePrice) - Number(form.purchasePrice)).toLocaleString()}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isSaving ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-indigo-600" /> Print Thermal Labels
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-inner">
              <p className="text-sm font-bold text-slate-800">{printProduct?.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1"><Barcode className="h-3 w-3"/> {printProduct?.barcode}</p>
              <p className="text-sm font-black text-emerald-600 mt-2">Rs. {Number(printProduct?.salePrice).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Quantity (Number of Stickers)</Label>
              <Input type="number" min="1" max="500" value={printQuantity} onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)} className="font-bold text-lg text-center h-12" />
              <p className="text-xs text-slate-400 text-center">Size: 50mm x 25mm</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2 font-bold shadow-md" onClick={handlePrintBarcodes}>
              <Printer className="h-4 w-4" /> Print Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Serial Track History
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
          ) : !detailData ? (
            <div className="py-8 text-center text-rose-500 font-semibold bg-rose-50 rounded-lg">Serial record not found!</div>
          ) : (
            <div className="space-y-4 py-2 text-sm">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Product</p>
                  <p className="font-bold text-slate-800">{detailData.products?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Serial Number</p>
                  <p className="font-mono font-bold text-indigo-700">{detailData.serial_number}</p>
                </div>
              </div>

              <div className="flex justify-between items-center border-b pb-3">
                <span className="font-bold text-slate-600">Current Status</span>
                <Badge className={`px-3 py-1 text-xs font-bold ${serialStatusStyle[detailData.status] || ""}`}>
                  {detailData.status?.replace("_", " ")}
                </Badge>
              </div>

              {detailData.purchase && (
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b pb-2"><ShoppingCart className="h-4 w-4 text-emerald-500"/> Purchase Info</h4>
                  <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span className="font-semibold">{detailData.supplier?.name || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Invoice #</span><span className="font-mono">{detailData.purchase.invoice_number}</span></div>
                </div>
              )}

              {detailData.sale && (
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b pb-2"><User className="h-4 w-4 text-blue-500"/> Sale Info</h4>
                  <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-semibold">{detailData.customer?.name || "Walk-in"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Invoice #</span><span className="font-mono text-indigo-600">{detailData.sale.invoice_number}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-medium">{new Date(detailData.sale.created_at).toLocaleString()}</span></div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="border-t pt-3">
            <Button className="w-full font-bold" variant="outline" onClick={() => setDetailOpen(false)}>Close Window</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}