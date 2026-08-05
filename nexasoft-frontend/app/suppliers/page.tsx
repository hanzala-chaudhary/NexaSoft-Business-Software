"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Building2, Loader2, Phone } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", address: "" });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuppliers = async (search?: string) => {
    try {
      setIsLoading(true);
      const url = search ? `${API_URL}/suppliers?search=${encodeURIComponent(search)}` : `${API_URL}/suppliers`;
      const res = await fetch(url);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Suppliers Fetch Error:", error);
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

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Supplier ka naam zaroori hai!");
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch(`${API_URL}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Supplier save nahi ho saka!");

      await fetchSuppliers();
      setIsDialogOpen(false);
      setForm({ name: "", company: "", phone: "", email: "", address: "" });
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-1">Kisi bhi supplier par click karke uska poora khata dekhein.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(""); }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold shadow-sm">
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddSupplier}>
              <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                {formError && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 font-semibold border border-rose-100">{formError}</div>}
                <div className="space-y-1.5">
                  <Label>Contact Person Name <span className="text-rose-500">*</span></Label>
                  <Input placeholder="e.g. Ali Ahmed" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Company Name (optional)</Label>
                  <Input placeholder="e.g. Hafeez Center Electronics" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input placeholder="03XX-XXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (optional)</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Address (optional)</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Saving..." : "Save Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b bg-transparent pb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Naam, company ya phone se search karein..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[60px]">Icon</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Invoices</TableHead>
                <TableHead className="text-right">Total Purchased</TableHead>
                <TableHead className="text-right">Humein Dena Hai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400"><Building2 className="h-10 w-10 mx-auto mb-2 opacity-20" />Koi supplier nahi mila.</TableCell></TableRow>
              ) : (
                suppliers.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
                    onClick={() => router.push(`/suppliers/${s.id}/ledger`)}
                  >
                    <TableCell>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-800">{s.name}</p>
                      {s.company && <p className="text-xs text-slate-400">{s.company}</p>}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {s.phone ? (
                        <span className="flex items-center gap-1.5 text-sm"><Phone className="h-3.5 w-3.5" /> {s.phone}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">{s.totalInvoices ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">
                      Rs. {Number(s.totalSpend ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(s.totalOutstanding ?? 0) > 0 ? (
                        <span className="font-bold text-rose-600">Rs. {Number(s.totalOutstanding).toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Clear</span>
                      )}
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