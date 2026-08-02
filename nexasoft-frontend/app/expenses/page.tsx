"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Loader2, Receipt, Calendar, FileText, Banknote, TrendingDown, Coffee } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/expenses`);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data = await res.json();
      setExpenses(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((e) =>
    e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- STATS CALCULATIONS ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const totalAllTime = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const totalThisMonth = expenses
    .filter(e => new Date(e.date) >= firstDayOfMonth)
    .reduce((sum, e) => sum + Number(e.amount), 0);
    
  const totalToday = expenses
    .filter(e => new Date(e.date) >= today)
    .reduce((sum, e) => sum + Number(e.amount), 0);

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
      setFormError("Expense ka Title likhna zaroori hai!");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Amount 0 se zyada honi chahiye!");
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
      if (!res.ok) throw new Error(result.message || "Expense save nahi ho saka");

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
    if (!window.confirm("Kya aap waqai is expense ko delete karna chahte hain?")) return;
    try {
      const res = await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense");
      
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Dukaan ke rozana ke kharche (Chaye pani, Bills, Salaries) manage karein.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-sm font-bold" onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4" /> Add New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add Expense (Kharcha)</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {formError && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 font-semibold border border-rose-100">{formError}</div>}
                
                <div className="space-y-1.5">
                  <Label htmlFor="title">Expense Title <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="title" placeholder="e.g. Dopehar ka khana" className="pl-9" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (Rs.) <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="amount" type="number" placeholder="e.g. 500" className="pl-9 font-bold text-indigo-700" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea 
                    id="description" 
                    placeholder="Koi mazeed tafseel..." 
                    className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 min-h-[80px]"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 font-bold" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Saving..." : "Save Expense"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- STATS BOXES --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-200 bg-white border-l-4 border-l-rose-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-bold text-slate-500 uppercase">Today's Expenses</p>
              <div className="h-10 w-10 bg-rose-50 rounded-full flex items-center justify-center">
                <Coffee className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">Rs. {totalToday.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-bold text-slate-500 uppercase">This Month</p>
              <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">Rs. {totalThisMonth.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white border-l-4 border-l-indigo-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-bold text-slate-500 uppercase">All Time Expenses</p>
              <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">Rs. {totalAllTime.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* --- EXPENSES TABLE --- */}
      <Card className="shadow-sm border-slate-200 flex flex-col bg-white">
        <CardHeader className="border-b bg-transparent pb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by title or category..."
              className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-rose-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-600">Date & Time</TableHead>
                <TableHead className="font-bold text-slate-600">Title</TableHead>
                <TableHead className="font-bold text-slate-600">Category</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Amount</TableHead>
                <TableHead className="text-center font-bold text-slate-600">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center flex-col items-center justify-center text-slate-400">
                    <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No expenses found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-slate-600 font-medium">
                      {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span className="text-xs text-slate-400 block">{new Date(expense.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-800">{expense.title}</p>
                      {expense.description && <p className="text-xs text-slate-500 mt-0.5">{expense.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 font-semibold">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-rose-600 text-base">
                      Rs. {Number(expense.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(expense.id)}>
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
    </div>
  );
}