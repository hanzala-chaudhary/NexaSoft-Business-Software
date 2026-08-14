"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Building2, Loader2, Phone, Mail, FileSpreadsheet, MessageCircle, Edit, Wallet, TrendingUp, AlertCircle, CheckCircle2, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Dialog & Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", address: "" });

  // Cloud Notifications
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>({ show: false, msg: "", type: "success" });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
  };

  const fetchSuppliers = async (search?: string) => {
    try {
      setIsLoading(true);
      const url = search ? `${API_URL}/suppliers?search=${encodeURIComponent(search)}` : `${API_URL}/suppliers`;
      const res = await fetch(url);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Suppliers Fetch Error:", error);
      showToast("Cloud connection error. Cannot sync supplier ledgers.", "error");
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuppliers(searchQuery.trim() || undefined);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Keyboard Shortcuts (F2 for Add, Slash for Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === "input" || activeTag === "textarea";

      if (e.key === "F2") {
        e.preventDefault();
        openAddDialog();
      }
      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openAddDialog = () => {
    setEditingId(null);
    setForm({ name: "", company: "", phone: "", email: "", address: "" });
    setFormError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (supplier: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || "",
      company: supplier.company || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || ""
    });
    setFormError("");
    setIsDialogOpen(true);
  };

  async function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Supplier ka naam zaroori hai!");
      return;
    }

    try {
      setIsSaving(true);
      const isEdit = editingId !== null;
      const url = isEdit ? `${API_URL}/suppliers/${editingId}` : `${API_URL}/suppliers`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          company: form.company.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Supplier save nahi ho saka!");

      await fetchSuppliers();
      setIsDialogOpen(false);
      showToast(isEdit ? "Supplier ledger updated successfully!" : "New supplier registered successfully!", "success");
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const exportToCSV = () => {
    if (suppliers.length === 0) {
      showToast("No data available to export.", "error");
      return;
    }

    const headers = ["Contact Person", "Company Name", "Phone", "Email", "Total Invoices", "Total Purchased (Rs)", "Payable Balance (Rs)"];
    const csvRows = [headers.join(",")];

    suppliers.forEach(s => {
      const row = [
        `"${s.name}"`,
        `"${s.company || "-"}"`,
        `"${s.phone || "-"}"`,
        `"${s.email || "-"}"`,
        s.totalInvoices || 0,
        s.totalPurchased || 0,
        s.totalOutstanding || 0
      ];
      csvRows.push(row.join(","));
    });

    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Suppliers_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("Suppliers ledger exported successfully!", "success");
  };

  // KPI Calculations
  const totalPayable = suppliers.reduce((sum, s) => sum + (Number(s.totalOutstanding) || 0), 0);
  const totalPurchased = suppliers.reduce((sum, s) => sum + (Number(s.totalPurchased) || 0), 0);

  return (
    <div className="flex h-full flex-col gap-6 p-6 lg:p-8 bg-slate-50 overflow-y-auto relative">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <div className={`fixed top-6 right-6 z-[200] transition-all duration-300 transform ${toast.show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border-l-4 ${toast.type === 'error' ? 'bg-rose-900 border-rose-500 text-white' : 'bg-emerald-900 border-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <p className="font-semibold text-sm">{toast.msg}</p>
          <button onClick={() => setToast({ ...toast, show: false })} className="ml-4 opacity-50 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-600" />
            Supplier Ledgers (Vendors)
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 ml-2 shadow-sm font-bold">Cloud Sync</Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage vendor accounts, track payable dues, and inspect purchase histories.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToCSV} className="border-slate-300 text-slate-700 font-bold hover:bg-slate-100 h-11 px-4 shadow-sm">
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Export CSV
          </Button>
          <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 gap-2 font-bold shadow-md transition-all hover:scale-105">
            <Plus className="h-5 w-5" /> Add Supplier <span className="text-[10px] ml-1 bg-emerald-800 px-1.5 py-0.5 rounded opacity-80">[F2]</span>
          </Button>
        </div>
      </div>

      {/* KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <Building2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Vendors</p>
              <h3 className="text-3xl font-black text-slate-900">{suppliers.length}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
              <Wallet className="h-7 w-7 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Humein Dena Hai (Payable)</p>
              <h3 className="text-3xl font-black text-rose-600">Rs. {totalPayable.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
              <TrendingUp className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lifetime Purchases</p>
              <h3 className="text-3xl font-black text-blue-600">Rs. {totalPurchased.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SUPPLIERS TABLE */}
      <Card className="shadow-lg border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Naam, company ya phone se search karein... (Press '/' to focus)"
              className="pl-11 h-12 bg-white border-slate-300 shadow-inner font-semibold focus-visible:ring-emerald-500 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="w-[60px]"></TableHead>
                <TableHead className="font-bold text-slate-700">Vendor Profile</TableHead>
                <TableHead className="font-bold text-slate-700">Contact Details</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Total Invoices</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Total Purchased</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Humein Dena Hai (Payable)</TableHead>
                <TableHead className="text-center font-bold text-slate-700 w-[120px]">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" /><p className="mt-2 text-slate-500 font-medium">Syncing vendor ledgers...</p></TableCell></TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-40 text-center text-slate-400"><Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" /><p className="text-lg font-bold">No suppliers found.</p></TableCell></TableRow>
              ) : (
                suppliers.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-emerald-50/40 transition-colors group"
                    onClick={() => router.push(`/suppliers/${s.id}/ledger`)}
                  >
                    <TableCell>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 border border-emerald-200 shadow-sm">
                        <span className="font-black text-emerald-700 text-lg">{s.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-extrabold text-slate-900 text-base">{s.name}</p>
                      {s.company && <p className="text-xs font-bold text-indigo-600">{s.company}</p>}
                      {s.address && <p className="text-xs text-slate-500 line-clamp-1">{s.address}</p>}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div className="flex flex-col gap-1">
                        {s.phone ? (
                          <span className="flex items-center gap-1.5 text-sm font-semibold"><Phone className="h-3.5 w-3.5 text-slate-400" /> {s.phone}</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Phone</span>
                        )}
                        {s.email && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3.5 w-3.5 text-slate-400" /> {s.email}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono bg-white font-bold">{s.totalInvoices ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-700 text-lg">
                      Rs. {Number(s.totalPurchased ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(s.totalOutstanding ?? 0) > 0 ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold px-3 py-1 text-sm shadow-sm">
                          Rs. {Number(s.totalOutstanding).toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Clear
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {s.phone && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent" title="WhatsApp" onClick={() => window.open(`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`, '_blank')}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent" title="Edit Profile" onClick={(e) => openEditDialog(s, e)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(""); }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-slate-50">
          <form onSubmit={handleSaveSupplier}>
            <div className="bg-emerald-600 px-6 py-5 text-white">
              <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
                <Building2 className="h-6 w-6" /> {editingId ? "Update Vendor Profile" : "Register New Supplier"}
              </DialogTitle>
              <p className="text-emerald-100 text-xs mt-1 font-medium">Supplier accounts dictate godam stock invoices and payment ledgers.</p>
            </div>
            
            <div className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 font-bold border border-rose-200 flex items-center gap-2 shadow-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" /> {formError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Contact Person Name <span className="text-rose-500">*</span></Label>
                <Input 
                  placeholder="e.g. Ali Ahmed" 
                  className="h-11 border-slate-300 font-bold bg-white text-base shadow-sm focus-visible:ring-emerald-500" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  required 
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Company Name <span className="text-slate-400 normal-case font-normal">(Optional)</span></Label>
                <Input 
                  placeholder="e.g. Hafeez Center Electronics" 
                  className="h-11 border-slate-300 font-bold bg-white shadow-sm focus-visible:ring-emerald-500" 
                  value={form.company} 
                  onChange={(e) => setForm({ ...form, company: e.target.value })} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Phone Number</Label>
                  <Input 
                    placeholder="03XX-XXXXXXX" 
                    className="h-11 border-slate-300 font-bold bg-white shadow-sm focus-visible:ring-emerald-500" 
                    value={form.phone} 
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5 relative group">
                  <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex justify-between">Email <span className="text-slate-400 normal-case font-normal">(Optional)</span></Label>
                  <Input 
                    type="text" 
                    className="h-11 border-slate-300 bg-white shadow-sm focus-visible:ring-emerald-500" 
                    placeholder="example@gmail.com" 
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight hidden group-hover:block transition-all">
                    Flexible format enabled (auto-corrects common input typos).
                  </p>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex justify-between">Physical Address <span className="text-slate-400 normal-case font-normal">(Optional)</span></Label>
                <Input 
                  className="h-11 border-slate-300 bg-white shadow-sm focus-visible:ring-emerald-500" 
                  placeholder="e.g. Hall Road, Lahore" 
                  value={form.address} 
                  onChange={(e) => setForm({ ...form, address: e.target.value })} 
                />
              </div>
            </div>
            
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <Button type="button" variant="outline" className="font-bold h-11 px-6 hover:bg-slate-100" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8 font-bold shadow-lg transition-transform hover:scale-105 gap-2 text-white" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {isSaving ? "Syncing..." : "Save Supplier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}