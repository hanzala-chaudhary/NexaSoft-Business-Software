"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, UserCircle, Trash2, Pencil, Loader2, Phone, Mail, MapPin, ShoppingBag } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const emptyForm = { name: "", phone: "", email: "", address: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/customers`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function openAddDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setIsDialogOpen(true);
  }

  function openEditDialog(customer: any) {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setFormError("");
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Customer ka naam likhna zaroori hai!");
      return;
    }

    const isEdit = editingId !== null;

    try {
      setIsSaving(true);
      const res = await fetch(
        isEdit ? `${API_URL}/customers/${editingId}` : `${API_URL}/customers`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Customer save nahi ho saka!");

      await fetchCustomers();
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
    if (!window.confirm("Kya aap waqai is customer ko delete karna chahte hain?")) return;
    try {
      const res = await fetch(`${API_URL}/customers/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete customer");
      
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (error: any) {
      alert(error.message);
    }
  }

  // Calculate total spend for a customer
  const calculateTotalSpend = (sales: any[]) => {
    if (!sales || sales.length === 0) return 0;
    return sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stakeholders / Customers</h1>
          <p className="text-sm text-slate-500">Apne tamam customers ka record aur unki khareedari track karein.</p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setFormError(""); setEditingId(null); } }}
        >
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> Add New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Customer" : "Add New Customer"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {formError && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 border border-rose-100">{formError}</div>}
                
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="name" placeholder="e.g. Ali Ahmad" className="pl-9" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="phone" placeholder="e.g. 0300-1234567" className="pl-9" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="email" type="email" placeholder="e.g. ali@example.com" className="pl-9" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea 
                      id="address" 
                      placeholder="Customer's full address..." 
                      className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] pl-9"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Saving..." : editingId ? "Update Customer" : "Save Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b bg-white pb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, phone or email..."
              className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-indigo-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[60px]">Icon</TableHead>
                <TableHead>Customer Info</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Total Invoices</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center flex-col items-center justify-center text-slate-400">
                    <UserCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((row) => {
                  const totalSpend = calculateTotalSpend(row.sales);
                  const invoiceCount = row.sales?.length || 0;

                  return (
                    <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase">
                          {row.name.charAt(0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        {row.address && <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.address}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {row.phone ? (
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                              <Phone className="h-3.5 w-3.5 text-slate-400" /> {row.phone}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Phone</span>
                          )}
                          {row.email && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail className="h-3.5 w-3.5 text-slate-400" /> {row.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                          <ShoppingBag className="h-3 w-3 mr-1" /> {invoiceCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-bold text-indigo-600">Rs. {totalSpend.toLocaleString()}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600" onClick={() => openEditDialog(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(row.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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