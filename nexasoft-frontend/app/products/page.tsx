"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, Package, Trash2, Pencil, Loader2,
  ChevronDown, ChevronRight, Barcode, Printer, Tag, FileText, User, ShoppingCart,
  AlertTriangle, CheckCircle2, TrendingUp, HelpCircle
} from "lucide-react";

// Enterprise API URL config
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

const emptyForm = { name: "", salePrice: "", purchasePrice: "", barcode: "", stock: "", categoryId: "", isSerialized: false };

// Fallback robust IT categories so dropdown is never empty
const DEFAULT_CATEGORIES = [
  { id: "cat-ssd", name: "SSD / NVMe Storage" },
  { id: "cat-ram", name: "RAM / Memory" },
  { id: "cat-cpu", name: "Processors (CPU)" },
  { id: "cat-mb", name: "Motherboards" },
  { id: "cat-gpu", name: "Graphics Cards (GPU)" },
  { id: "cat-psu", name: "Power Supply (PSU)" },
  { id: "cat-acc", name: "Accessories & Cables" },
];

const serialStatusStyle: Record<string, string> = {
  IN_STOCK: "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm",
  SOLD: "bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm",
  RESERVED: "bg-amber-100 text-amber-800 border-amber-300 shadow-sm",
  RETURNED: "bg-slate-200 text-slate-800 border-slate-300 shadow-sm",
  IN_REPAIR: "bg-purple-100 text-purple-800 border-purple-300 shadow-sm",
  DAMAGED: "bg-rose-100 text-rose-800 border-rose-300 shadow-sm",
  LOST: "bg-rose-100 text-rose-800 border-rose-300 shadow-sm",
  RMA: "bg-rose-100 text-rose-800 border-rose-300 shadow-sm",
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
  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
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
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // Merge API categories with default ones, avoiding duplicates by name
          const existingNames = new Set(data.map((c: any) => c.name.toLowerCase()));
          const missingDefaults = DEFAULT_CATEGORIES.filter(dc => !existingNames.has(dc.name.toLowerCase()));
          setCategories([...data, ...missingDefaults]);
        }
      }
    } catch (error) {
      console.error("Categories Fetch Error, using defaults:", error);
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
      setFormError("Product Name, Sale Price, aur Purchase Price laazmi hain!");
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
    if (!window.confirm("🚨 WARNING: Kya aap waqai is product ko delete karna chahte hain? Iska data permanently remove ho jayega!")) return;
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete product");
      setRows(rows.filter((r) => r.id !== id));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  const openPrintModal = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.isSerialized) {
      alert("⚠️ Ye serialized product hai — iske liye alag se Serial Number labels chahiye honge, master barcode print nahi hota.");
      return;
    }
    if (!product.barcode || product.barcode === "-") {
      alert("⚠️ Is product ka koi Barcode nahi hai! Pehle edit karke barcode add karein.");
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
    <div className="flex h-full flex-col gap-6 p-6 lg:p-8 bg-slate-50 overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-600" />
            Master Product Catalog
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2 shadow-sm font-bold">Main Shop</Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Centralized Database for POS Sales, Inventory & Godam Tracking.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 gap-2 font-bold shadow-md transition-all hover:scale-105" onClick={openAddDialog}>
          <Plus className="h-5 w-5" /> Add New Product
        </Button>
      </div>

      {/* TABLE CARD */}
      <Card className="shadow-md border-slate-200 bg-white">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <div className="relative flex-1 max-w-2xl">
            {isSearching ? (
              <Loader2 className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-500 animate-spin" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            )}
            <Input
              placeholder="Search by Product Name, Master Barcode, or specific Hardware Serial Number..."
              className="pl-11 bg-white border-slate-300 text-base h-12 shadow-inner focus-visible:ring-indigo-500 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[60px]"></TableHead>
                <TableHead className="font-bold text-slate-700">Product Identity</TableHead>
                <TableHead className="font-bold text-slate-700">Tracking Type</TableHead>
                <TableHead className="font-bold text-slate-700">Master Barcode</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Cost Price</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Retail Price</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Est. Margin</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Shop Stock</TableHead>
                <TableHead className="w-[140px] text-center font-bold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center text-slate-500">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-lg">No inventory records found.</p>
                    <p className="text-sm mt-1">Try adjusting your search or add a new product.</p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const margin = row.salePrice - row.purchasePrice;
                  const isExpanded = expandedId === row.id;
                  const hasSearchMatch = searchQuery.trim() && row.matchedSerials.length > 0;

                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className={`cursor-pointer hover:bg-indigo-50/40 transition-colors ${isExpanded ? 'bg-indigo-50/40' : ''}`} onClick={() => toggleExpand(row.id)}>
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-5 w-5 text-indigo-500" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200">
                            <Tag className="h-5 w-5 text-indigo-600" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-slate-900 line-clamp-1 text-base">{row.name}</p>
                          {(row.categoryName || row.brandName) && (
                            <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">
                              {[row.brandName, row.categoryName].filter(Boolean).join(" • ")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.isSerialized ? (
                            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 shadow-sm font-bold">SERIALIZED</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600 bg-slate-100 font-bold">BULK / BARCODE</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-slate-700 bg-white shadow-sm border-slate-300 font-bold">{row.barcode}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-slate-600 font-semibold">Rs. {row.purchasePrice.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-black text-slate-900 text-lg">Rs. {row.salePrice.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-black ${margin <= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {margin > 0 ? "+" : ""}Rs. {margin.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`shadow-sm px-3 py-1 font-black ${row.stock <= 0 ? 'bg-rose-100 text-rose-800 border-rose-300' : row.stock < 5 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`} variant="outline">
                            {row.stock}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Button variant="outline" size="icon" className="text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors" onClick={(e) => openPrintModal(row, e)} title="Print Barcodes">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors" onClick={() => openEditDialog(row)} title="Edit Product">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors" onClick={() => handleDelete(row.id)} title="Delete Product">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {hasSearchMatch && (
                        <TableRow className="bg-emerald-50">
                          <TableCell colSpan={10} className="px-6 py-4 border-l-4 border-l-emerald-500">
                            <p className="text-xs font-black text-emerald-800 mb-2 uppercase tracking-wider flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" /> Search Match: Serial Numbers Found
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {row.matchedSerials.map((s: any) => (
                                <button
                                  key={s.serial_number}
                                  onClick={() => openSerialDetail(s.serial_number)}
                                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-mono font-bold transition-transform hover:scale-105 border ${serialStatusStyle[s.status] || "bg-white text-slate-700 border-slate-300 shadow-sm"}`}
                                >
                                  <Barcode className="h-3 w-3 opacity-50"/> {s.serial_number} — {s.status.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {isExpanded && (
                        <TableRow className="bg-slate-50 border-b-2 border-b-slate-200">
                          <TableCell colSpan={10} className="px-6 py-6 border-l-4 border-l-indigo-500 shadow-inner">
                            {loadingSerials === row.id ? (
                              <div className="flex justify-center items-center gap-2 text-sm font-bold text-indigo-600 py-4">
                                <Loader2 className="h-6 w-6 animate-spin" /> Retrieving hardware serials from database...
                              </div>
                            ) : (serialsMap[row.id]?.length ?? 0) === 0 ? (
                              <div className="bg-white p-6 rounded-lg border border-slate-200 text-center text-slate-500 shadow-sm">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30"/>
                                <p className="font-bold">No Active Serials Found</p>
                                <p className="text-xs mt-1">This product currently has zero serial numbers registered in the main shop stock.</p>
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-xs font-black text-slate-700 mb-3 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                  <Package className="h-4 w-4 text-indigo-500"/>
                                  Active In-Stock Serials ({serialsMap[row.id].length} Units)
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                  {serialsMap[row.id].map((s) => (
                                    <button
                                      key={s.serial_number}
                                      onClick={() => openSerialDetail(s.serial_number)}
                                      className="flex items-center justify-between gap-1.5 rounded bg-slate-50 border border-slate-300 shadow-sm px-2 py-2 text-[11px] font-mono font-bold text-slate-800 transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow"
                                    >
                                      <span>{s.serial_number}</span>
                                      <ChevronRight className="h-3 w-3 opacity-30"/>
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

      {/* VIP ADD/EDIT PRODUCT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-slate-50">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            
            <div className="bg-indigo-600 px-6 py-5 text-white">
              <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
                {editingId ? <Pencil className="h-6 w-6"/> : <Package className="h-6 w-6"/>}
                {editingId ? "Edit Product Identity" : "Register New Product"}
              </DialogTitle>
              <DialogDescription className="text-indigo-100 mt-1 font-medium text-xs">
                Enter details carefully. This data dictates pricing across POS and Godam transfers.
              </DialogDescription>
            </div>

            <div className="px-6 py-6 grid grid-cols-2 gap-5">
              {formError && (
                <div className="col-span-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 font-bold border border-rose-200 flex items-start gap-2 shadow-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600"/> {formError}
                </div>
              )}

              {/* Product Info Section */}
              <div className="col-span-2 space-y-2">
                <Label className="font-bold text-slate-700 text-sm">Official Product Name <span className="text-rose-500">*</span></Label>
                <Input className="h-11 border-slate-300 bg-white shadow-sm font-semibold text-base focus-visible:ring-indigo-500" placeholder="e.g. Samsung 980 Pro 1TB NVMe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="font-bold text-slate-700 text-sm">Product Category</Label>
                <select className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium"
                  value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => <option key={c.id} value={c.id || c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="font-bold text-slate-700 text-sm">{editingId ? "Current Shop Stock" : "Opening Stock"}</Label>
                <Input type="number" min="0" className="h-11 border-slate-300 bg-white shadow-sm font-bold text-lg" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>

              {/* Enterprise Toggle for Serialization */}
              <div className="col-span-2 rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-all focus-within:border-indigo-400 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${form.isSerialized ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Barcode className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">Strict Serial Tracking?</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">Enable for IT hardware (SSDs, RAM, Displays).<br/>Disable for bulk accessories (Cables, Covers).</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={form.isSerialized} onChange={() => setForm({ ...form, isSerialized: !form.isSerialized })} />
                    <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                  </label>
                </div>

                {!form.isSerialized ? (
                   <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                     <Label className="font-bold text-slate-700 text-xs mb-1.5 block">Master Barcode (For Bulk Scanning)</Label>
                     <Input className="h-11 border-slate-300 bg-slate-50 font-mono tracking-widest text-sm focus-visible:ring-indigo-500" placeholder="Scan or type barcode here..." value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                   </div>
                ) : (
                   <div className="mt-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 flex items-start gap-2 text-indigo-700 bg-indigo-50 p-3 rounded-lg text-xs font-bold border border-indigo-100">
                     <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
                     Master barcode is disabled. Each unit will be tracked via its own unique hardware serial number scanned at Godam entry.
                   </div>
                )}
              </div>

              {/* Pricing & Margin VIP Card */}
              <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-2 gap-4 mt-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5"><TrendingUp className="h-24 w-24"/></div>
                <div className="space-y-2 relative z-10">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Purchase Cost (PKR) <span className="text-rose-500">*</span></Label>
                  <Input type="number" step="0.01" min="0" className="h-11 border-slate-300 bg-slate-50 font-black text-lg focus-visible:ring-emerald-500" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} required />
                </div>
                <div className="space-y-2 relative z-10">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Retail Sale Price (PKR) <span className="text-rose-500">*</span></Label>
                  <Input type="number" step="0.01" min="0" className="h-11 border-indigo-300 bg-indigo-50 text-indigo-700 font-black text-lg focus-visible:ring-indigo-500" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required />
                </div>

                {form.purchasePrice && form.salePrice && (
                  <div className={`col-span-2 mt-2 px-4 py-3 rounded-lg flex items-center justify-between shadow-inner border font-bold text-sm ${Number(form.salePrice) - Number(form.purchasePrice) >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Est. Profit Margin (Per Unit):</span>
                    <span className="text-lg">Rs. {(Number(form.salePrice) - Number(form.purchasePrice)).toLocaleString()}</span>
                  </div>
                )}
              </div>

            </div>

            <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <Button type="button" variant="outline" className="h-11 px-6 font-bold text-slate-600" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-bold shadow-lg transition-transform hover:scale-105" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                {isSaving ? "Processing..." : "Confirm & Save Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PRINT BARCODE MODAL */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
          <div className="bg-blue-600 px-6 py-4 text-white flex items-center gap-3">
            <Printer className="h-6 w-6" /> 
            <div>
               <DialogTitle className="text-lg font-bold">Print Thermal Labels</DialogTitle>
               <DialogDescription className="text-blue-100 text-xs font-medium">Generate stickers for retail scanning.</DialogDescription>
            </div>
          </div>
          <div className="p-6 space-y-5 bg-slate-50">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
              <p className="text-sm font-extrabold text-slate-800 line-clamp-2">{printProduct?.name}</p>
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-slate-100 rounded-md border border-slate-300">
                 <Barcode className="h-4 w-4 text-slate-500"/>
                 <span className="text-sm font-mono font-bold text-slate-700 tracking-widest">{printProduct?.barcode}</span>
              </div>
              <p className="text-xl font-black text-emerald-600 mt-4">Rs. {Number(printProduct?.salePrice).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Quantity (Number of Stickers to print)</Label>
              <Input type="number" min="1" max="500" value={printQuantity} onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)} className="font-black text-2xl text-center h-14 border-slate-300 focus-visible:ring-blue-500 shadow-inner" />
              <p className="text-xs text-slate-400 text-center font-medium mt-1">Standard Thermal Size: 50mm x 25mm</p>
            </div>
          </div>
          <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" className="font-bold" onClick={() => setIsPrintModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md" onClick={handlePrintBarcodes}>
              <Printer className="h-4 w-4 mr-2" /> Execute Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIP SERIAL HISTORY TRACKER MODAL */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-slate-50">
          <div className="bg-slate-800 px-6 py-4 text-white flex items-center gap-3">
             <FileText className="h-6 w-6 text-indigo-400" />
             <div>
                <DialogTitle className="text-lg font-bold">Asset Tracking Profile</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs font-medium">Detailed audit log for selected hardware serial.</DialogDescription>
             </div>
          </div>
          <div className="p-6">
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                 <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                 <p className="text-sm font-bold text-slate-500">Decrypting serial logs...</p>
              </div>
            ) : !detailData ? (
              <div className="py-10 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200 shadow-inner">
                 <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50"/>
                 <p className="font-bold text-lg">Record Not Found</p>
                 <p className="text-sm font-medium">This serial number does not exist in the secure registry.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5"><Barcode className="h-32 w-32"/></div>
                  <div className="relative z-10">
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Hardware ID</p>
                    <p className="text-2xl font-black font-mono text-indigo-700 tracking-tight">{detailData.serial_number}</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{detailData.products?.name}</p>
                  </div>
                  <div className="text-right relative z-10">
                    <Badge className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${serialStatusStyle[detailData.status] || "bg-slate-100 text-slate-700"}`}>
                      {detailData.status?.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detailData.purchase && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                         <ShoppingCart className="h-4 w-4 text-emerald-500"/> Procurement Data
                      </h4>
                      <div className="space-y-1.5 text-sm">
                         <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Supplier</span><span className="font-bold text-slate-800 text-right">{detailData.supplier?.name || "N/A"}</span></div>
                         <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Invoice #</span><span className="font-mono font-bold text-slate-700">{detailData.purchase.invoice_number}</span></div>
                      </div>
                    </div>
                  )}

                  {detailData.sale && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                         <User className="h-4 w-4 text-blue-500"/> Dispatch / Sale Data
                      </h4>
                      <div className="space-y-1.5 text-sm">
                         <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Customer</span><span className="font-bold text-slate-800 text-right">{detailData.customer?.name || "Walk-in Counter"}</span></div>
                         <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Invoice #</span><span className="font-mono font-bold text-indigo-600">{detailData.sale.invoice_number}</span></div>
                         <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Time</span><span className="font-semibold text-slate-700 text-xs">{new Date(detailData.sale.created_at).toLocaleDateString()}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="bg-white border-t border-slate-200 px-6 py-4">
            <Button className="w-full font-bold bg-slate-800 hover:bg-slate-700 h-11 shadow-md" onClick={() => setDetailOpen(false)}>Acknowledge & Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}