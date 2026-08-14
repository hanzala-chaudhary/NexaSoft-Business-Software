"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, Plus, Trash2, Loader2, Receipt, Calendar, FileText, Banknote, 
  TrendingDown, Coffee, X, AlertCircle, CheckCircle2, Download, Filter 
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utility Bills (Bijli/Internet)",
  "Salaries",
  "Food & Tea (Chaye Pani)",
  "Maintenance",
  "Marketing",
  "Logistics / Delivery",
  "Other"
];

const emptyForm = { title: "", amount: "", category: "Food & Tea (Chaye Pani)", description: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  // Cloud Notifications
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>({ show: false, msg: "", type: "success" });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
  };

  useEffect(() => {
    fetchExpenses();

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === "input" || activeTag === "textarea";

      if (e.key === "F2" && !isDialogOpen) {
        e.preventDefault();
        handleOpenAddDialog();
      }
      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        document.getElementById("search-expenses")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen]);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/expenses`);
      if (!res.ok) throw new Error("Cloud sync failed. Cannot fetch expenses.");
      const data = await res.json();
      setExpenses(data);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // --- FILTERING LOGIC ---
  const filteredExpenses = expenses.filter((e) => {
    // 1. Text Search
    const query = searchQuery.toLowerCase();
    const textMatch = e.title?.toLowerCase().includes(query) || e.description?.toLowerCase().includes(query);
    if (query && !textMatch) return false;

    // 2. Category Filter
    if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false;

    // 3. Date Filter
    if (dateFilter !== "ALL") {
      const expDate = new Date(e.date);
      if (dateFilter === "TODAY" && expDate < today) return false;
      if (dateFilter === "THIS_MONTH" && (expDate.getMonth() !== today.getMonth() || expDate.getFullYear() !== today.getFullYear())) return false;
    }

    return true;
  });

  // --- STATS CALCULATIONS (Based on full data) ---
  const totalAllTime = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalThisMonth = expenses.filter(e => new Date(e.date) >= firstDayOfMonth).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalToday = expenses.filter(e => new Date(e.date) >= today).reduce((sum, e) => sum + Number(e.amount), 0);

  // --- FORM HANDLERS ---
  const handleOpenAddDialog = () => {
    setForm(emptyForm);
    setFormError("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Expense Title is strictly required!");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Amount must be greater than 0!");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to sync expense to cloud.");

      showToast("Kharcha (Expense) logged successfully!", "success");
      await fetchExpenses();
      setIsDialogOpen(false);
      setForm(emptyForm);
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("WARNING: Are you sure you want to permanently delete this expense record?")) return;
    try {
      const res = await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion blocked by cloud security.");
      
      setExpenses(expenses.filter((e) => e.id !== id));
      showToast("Expense record deleted permanently.", "success");
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      showToast("No data to export.", "error");
      return;
    }
    
    const headers = ["Date", "Expense Title", "Category", "Description", "Amount (Rs)"];
    const csvRows = [headers.join(",")];
    
    filteredExpenses.forEach(e => {
      const date = new Date(e.date).toLocaleString();
      const row = [
        `"${date}"`,
        `"${e.title}"`,
        `"${e.category}"`,
        `"${e.description || "-"}"`,
        e.amount
      ];
      csvRows.push(row.join(","));
    });
    
    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Expenses_Export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("Expense report exported successfully!", "success");
  };

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-rose-600" />
            Company Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage daily operational costs, bills, and staff salaries.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={exportToCSV} variant="outline" className="font-bold border-slate-300 shadow-sm h-11 px-4 gap-2 text-slate-700">
            <Download className="h-4 w-4 text-emerald-600" /> Export CSV
          </Button>
          <Button onClick={handleOpenAddDialog} className="bg-rose-600 hover:bg-rose-700 h-11 px-6 gap-2 font-bold shadow-md transition-transform hover:scale-105">
            <Plus className="h-5 w-5" /> Add Expense <span className="text-[10px] ml-1 bg-rose-800 px-1.5 py-0.5 rounded opacity-80">[F2]</span>
          </Button>
        </div>
      </div>

      {/* --- STATS BOXES --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-none bg-gradient-to-br from-rose-50 to-red-50 relative overflow-hidden">
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-extrabold text-rose-500 uppercase tracking-widest">Today's Expenses</p>
              <div className="h-10 w-10 bg-rose-200/50 rounded-full flex items-center justify-center">
                <Coffee className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            <div className="text-4xl font-black text-rose-900 mt-2 tracking-tight">Rs. {totalToday.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-extrabold text-amber-600 uppercase tracking-widest">This Month</p>
              <div className="h-10 w-10 bg-amber-200/50 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-700" />
              </div>
            </div>
            <div className="text-4xl font-black text-amber-900 mt-2 tracking-tight">Rs. {totalThisMonth.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-gradient-to-br from-indigo-50 to-blue-50 relative overflow-hidden">
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-extrabold text-indigo-500 uppercase tracking-widest">All Time Expenses</p>
              <div className="h-10 w-10 bg-indigo-200/50 rounded-full flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="text-4xl font-black text-indigo-900 mt-2 tracking-tight">Rs. {totalAllTime.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* --- EXPENSES TABLE & FILTERS --- */}
      <Card className="shadow-lg border-slate-200 flex flex-col bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                id="search-expenses"
                placeholder="Search expense title or description... (Press '/')"
                className="pl-11 h-12 bg-white border-slate-300 shadow-inner font-semibold focus-visible:ring-rose-500 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg h-12 px-3 shadow-sm">
                <Filter className="h-4 w-4 text-slate-400" />
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none focus:ring-0 cursor-pointer max-w-[150px]"
                >
                  <option value="ALL">All Categories</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg h-12 px-3 shadow-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <select 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="THIS_MONTH">This Month</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="font-bold text-slate-700 w-[180px]">Date & Time</TableHead>
                <TableHead className="font-bold text-slate-700">Expense Title</TableHead>
                <TableHead className="font-bold text-slate-700">Category</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Amount</TableHead>
                <TableHead className="text-center font-bold text-slate-700 w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-rose-500" /><p className="mt-2 text-slate-500 font-medium">Syncing Khata...</p></TableCell></TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center flex-col items-center justify-center text-slate-400">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-bold">No expenses found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-rose-50/40 transition-colors group">
                    <TableCell className="text-slate-600">
                      <div className="font-bold">{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-xs text-slate-400 font-semibold">{new Date(expense.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell>
                      <p className="font-extrabold text-slate-800 text-base">{expense.title}</p>
                      {expense.description && <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">{expense.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-bold">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-rose-600 text-lg">
                      Rs. {Number(expense.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-100 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- ADD EXPENSE MODAL --- */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(""); }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-slate-50">
          <form onSubmit={handleSubmit}>
            <div className="bg-rose-600 px-6 py-5 text-white">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Receipt className="h-6 w-6" /> Log New Expense (Kharcha)
              </DialogTitle>
              <p className="text-rose-100 text-xs mt-1 font-medium">Record business expenses to calculate accurate net profit.</p>
            </div>
            
            <div className="p-6 space-y-5">
              {formError && (
                <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 font-bold border border-rose-200 flex items-center gap-2 shadow-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" /> {formError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expense Title <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input id="title" placeholder="e.g. Dopehar ka khana" className="pl-11 h-12 font-bold text-base shadow-sm focus-visible:ring-rose-500" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (Rs.) <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-400" />
                  <Input id="amount" type="number" min="1" placeholder="e.g. 500" className="pl-11 h-12 font-black text-xl text-rose-600 shadow-sm focus-visible:ring-rose-500" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</Label>
                <select 
                  id="category"
                  className="flex h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description <span className="text-slate-400 normal-case font-normal">(Optional)</span></Label>
                <textarea 
                  id="description" 
                  placeholder="Koi mazeed tafseel..." 
                  className="flex w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 min-h-[90px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                />
              </div>
            </div>
            
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
              <Button type="button" variant="outline" className="flex-1 font-bold h-12 hover:bg-slate-100" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white font-black h-12 shadow-lg hover:shadow-xl transition-all gap-2" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {isSaving ? "Syncing..." : "SAVE EXPENSE"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}