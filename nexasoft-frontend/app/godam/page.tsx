"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  Lock,
  Loader2,
  Package,
  LayoutDashboard,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  ShieldCheck,
  Activity,
  ArrowRightLeft,
  Search,
  Eye,
  CheckCircle2
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const GODAM_TOKEN_KEY = "godam_access_token";

const CASH_CATEGORIES = ["rent", "labour", "transport", "utility", "stock_purchase", "dispatch_sale", "misc"];

type Tab = "dashboard" | "stock" | "cash" | "reports" | "audit";

// ============================================================
// Root component — password gate ke peeche poora Godam module
// ============================================================
export default function GodamPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem(GODAM_TOKEN_KEY);
    setUnlocked(!!token);
    setCheckingSession(false);
  }, []);

  if (checkingSession) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!unlocked) {
    return <GodamLockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <GodamDashboardShell onLock={() => { sessionStorage.removeItem(GODAM_TOKEN_KEY); setUnlocked(false); }} />;
}

// ============================================================
// Lock screen - Enterprise VIP UI
// ============================================================
function GodamLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) return setError("Secure password enter karein");

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/godam/verify-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid Security Clearance!");

      sessionStorage.setItem(GODAM_TOKEN_KEY, data.token);
      onUnlock();
    } catch (err: any) {
      setError(err.message || "Authentication Failed");
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0f1117] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))]">
      <Card className="w-full max-w-md shadow-2xl border-white/10 bg-[#1a1d27] text-white">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <ShieldCheck className="h-10 w-10 text-indigo-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Godam Secure Portal</CardTitle>
          <p className="text-sm text-slate-400">Restricted Area. Main shop system is isolated.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-slate-300">
                <Lock className="h-3.5 w-3.5" /> Authentication Key
              </Label>
              <Input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="bg-[#0f1117] border-white/10 text-white placeholder:text-slate-600 h-12 text-lg tracking-widest focus-visible:ring-indigo-500"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Lock className="h-5 w-5 mr-2" />}
              Authorize & Enter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Shell — Fixed Sticky Layout to prevent scroll bugs
// ============================================================
function GodamDashboardShell({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "stock", label: "Inventory Manager", icon: Package },
    { id: "cash", label: "Financial Ledger", icon: Wallet },
    { id: "reports", label: "Profit & Loss", icon: TrendingUp },
    { id: "audit", label: "Audit Logs", icon: Activity },
  ];

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 relative overflow-hidden">
      
      {/* 🔴 BUG FIX: STICKY HEADER - Yeh hissa kabhi scroll nahi hoga */}
      <div className="z-40 bg-white shadow-sm border-b border-slate-200 shrink-0">
        <div className="px-6 lg:px-8 pt-6 pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                <Warehouse className="h-8 w-8 text-indigo-600" />
                Central Godam System
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 ml-2 shadow-sm">VIP Access</Badge>
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Advanced isolated asset management and valuation.</p>
            </div>
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-sm" onClick={onLock}>
              <Lock className="h-4 w-4 mr-2" /> Secure Lock
            </Button>
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center whitespace-nowrap gap-2 px-5 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
                  tab === t.id
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🔴 BUG FIX: SCROLLABLE CONTENT - Sirf neechay wala hissa scroll hoga */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
        {tab === "dashboard" && <GodamDashboardTab />}
        {tab === "stock" && <GodamStockTab />}
        {tab === "cash" && <GodamCashTab />}
        {tab === "reports" && <GodamReportsTab />}
        {tab === "audit" && <GodamAuditTab />}
      </div>
    </div>
  );
}

// ============================================================
// Shared fetch helper
// ============================================================
async function godamFetch(path: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem(GODAM_TOKEN_KEY);
  const res = await fetch(`${API_URL}/godam${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-godam-token": token || "",
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    sessionStorage.removeItem(GODAM_TOKEN_KEY);
    window.location.reload(); 
  }
  return res;
}

// ============================================================
// Dashboard tab
// ============================================================
function GodamDashboardTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await godamFetch("/dashboard");
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const cards = [
    { label: "Total Asset Valuation", value: `Rs. ${Number(data?.totalStockValue || 0).toLocaleString()}`, icon: Package, color: "indigo", desc: "Live market value of inventory" },
    { label: "Godam Vault Balance", value: `Rs. ${Number(data?.cashBalance || 0).toLocaleString()}`, icon: Wallet, color: "emerald", desc: "Available cash in godam" },
    { label: "Net Performance (P&L)", value: `Rs. ${Number(data?.netProfitLoss || 0).toLocaleString()}`, icon: data?.netProfitLoss >= 0 ? TrendingUp : TrendingDown, color: data?.netProfitLoss >= 0 ? "emerald" : "rose", desc: "Overall profit/loss metric" },
    { label: "Critical Stock Alerts", value: `${(data?.inventoryHealth?.warning || 0) + (data?.inventoryHealth?.critical || 0)} Triggers`, icon: AlertTriangle, color: "amber", desc: "Items requiring immediate restock" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <Card key={c.label} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">{c.label}</p>
                  <p className={`text-2xl font-black text-${c.color}-600`}>{c.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl bg-${c.color}-50 border border-${c.color}-100 flex items-center justify-center shadow-sm`}>
                  <c.icon className={`h-6 w-6 text-${c.color}-600`} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 font-medium">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500"/> System Health & Activity</CardTitle>
            <CardDescription>Real-time godam infrastructure metrics</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Storage Optimization</span>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Optimal (100%)</Badge>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Last System Audit</span>
                  <span className="text-sm font-bold text-slate-900">Just Now</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Isolation Security Status</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex gap-1 items-center"><ShieldCheck className="w-3 h-3"/> Secured</Badge>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Stock In/Out/Transfer tab - FIX: Manual Product Entry
// ============================================================
function GodamStockTab() {
  const [balances, setBalances] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Feedback states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({ productName: "", type: "IN", quantity: "", unitCost: "", reason: "", note: "" });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [balRes, entRes] = await Promise.all([
        godamFetch("/stock"),
        godamFetch("/stock/entries")
      ]);
      setBalances(balRes.ok ? await balRes.json() : []);
      setEntries(entRes.ok ? await entRes.json() : []);
    } catch (e) {
      console.error("Stock load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // 🔴 BUG FIX: Validation checking if name is empty
    if (!form.productName.trim()) return setError("Please enter an Item Name manually or select from the list.");
    if (!form.quantity || Number(form.quantity) <= 0) return setError("Quantity must be greater than zero.");
    if (form.type === "IN" && (!form.unitCost || Number(form.unitCost) < 0)) return setError("Valid Unit Cost is required for Stock IN.");

    const apiType = form.type === "TRANSFER" ? "OUT" : form.type;
    const finalReason = form.type === "TRANSFER" ? "TRANSFER_TO_SHOP" : form.reason;

    try {
      setSaving(true);
      const res = await godamFetch("/stock", {
        method: "POST",
        body: JSON.stringify({
          productName: form.productName.trim(), // API isolated godam relies on this name
          type: apiType,
          quantity: Number(form.quantity),
          unitCost: Number(form.unitCost) || 0,
          reason: finalReason,
          note: form.note || (form.type === "TRANSFER" ? "Moved stock to main shop inventory" : ""),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Operation Failed");

      await loadAll();
      setForm({ productName: "", type: "IN", quantity: "", unitCost: "", reason: "", note: "" });
      
      // Professional success feedback
      setSuccess(`Success! ${form.quantity}x ${form.productName} processed successfully.`);
      setTimeout(() => setSuccess(""), 4000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredBalances = balances.filter(b => b.productName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <Card className="xl:col-span-1 h-fit shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/80 border-b pb-4">
          <CardTitle className="text-lg">Process Inventory</CardTitle>
          <CardDescription>Add, remove or transfer stock independently</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0"/> {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0"/> {success}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => { setForm({ ...form, type: "IN" }); setError(""); setSuccess(""); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-xs font-bold transition-all ${
                  form.type === "IN" ? "bg-white shadow-sm text-emerald-600 ring-1 ring-emerald-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <ArrowDownCircle className="h-5 w-5 mb-1" /> STOCK IN
              </button>
              <button
                type="button"
                onClick={() => { setForm({ ...form, type: "OUT" }); setError(""); setSuccess(""); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-xs font-bold transition-all ${
                  form.type === "OUT" ? "bg-white shadow-sm text-rose-600 ring-1 ring-rose-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <ArrowUpCircle className="h-5 w-5 mb-1" /> STOCK OUT
              </button>
              <button
                type="button"
                onClick={() => { setForm({ ...form, type: "TRANSFER" }); setError(""); setSuccess(""); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-xs font-bold transition-all ${
                  form.type === "TRANSFER" ? "bg-white shadow-sm text-indigo-600 ring-1 ring-indigo-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <ArrowRightLeft className="h-5 w-5 mb-1" /> TRANSFER
              </button>
            </div>

            {/* 🔴 BUG FIX: Smart Textbox Input instead of empty Dropdown */}
            <div className="space-y-2 relative">
              <Label className="font-semibold text-slate-700">Item Name <span className="text-rose-500">*</span></Label>
              <Input 
                list="godam-existing-products" 
                autoComplete="off"
                placeholder="Type new item or select existing..."
                className="h-11 font-medium focus-visible:ring-indigo-500 focus-visible:border-indigo-500 border-slate-300"
                value={form.productName} 
                onChange={(e) => setForm({ ...form, productName: e.target.value })} 
              />
              <datalist id="godam-existing-products">
                {balances.map(b => (
                  <option key={b.id} value={b.productName} />
                ))}
              </datalist>
              <p className="text-[10px] text-slate-500 mt-1">Free text allowed. System will automatically register new items.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Quantity <span className="text-rose-500">*</span></Label>
                <Input type="number" min="1" className="h-11 font-bold text-lg border-slate-300 focus-visible:ring-indigo-500" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Cost (Rs) {form.type !== "IN" && <span className="text-[10px] text-slate-400 font-normal uppercase ml-1">Auto</span>}</Label>
                <Input type="number" min="0" className="h-11 font-bold text-lg border-slate-300 focus-visible:ring-indigo-500" disabled={form.type !== "IN"} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} placeholder={form.type !== "IN" ? "Auto Evaluated" : "e.g. 1500"} />
              </div>
            </div>

            {form.type !== "TRANSFER" && (
               <div className="space-y-2">
                 <Label className="font-semibold text-slate-700">Reason / Reference</Label>
                 <Input className="h-11 border-slate-300 focus-visible:ring-indigo-500" placeholder="e.g. Supplier Batch #102, Damaged" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
               </div>
            )}

            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Additional Notes</Label>
              <Input className="h-11 border-slate-300 focus-visible:ring-indigo-500" placeholder="Optional details..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>

            <Button type="submit" className={`w-full h-12 text-base font-bold shadow-lg transition-colors ${form.type === "IN" ? "bg-emerald-600 hover:bg-emerald-700" : form.type === "TRANSFER" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-600 hover:bg-rose-700"}`} disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : form.type === "IN" ? <PlusCircle className="h-5 w-5 mr-2" /> : form.type === "TRANSFER" ? <ArrowRightLeft className="h-5 w-5 mr-2" /> : <MinusCircle className="h-5 w-5 mr-2" />}
              {form.type === "IN" ? "Add to Godam" : form.type === "TRANSFER" ? "Dispatch to Main Shop" : "Remove from Godam"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="xl:col-span-2 space-y-6">
        <Card className="shadow-md border-slate-200">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/80 border-b pb-4 gap-4">
             <div>
                <CardTitle className="text-lg">Live Asset Valuation</CardTitle>
                <CardDescription>Current Godam Stock Metrics</CardDescription>
             </div>
             <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="text" placeholder="Search item..." className="pl-9 h-9 w-full sm:w-[250px] text-sm focus-visible:ring-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
             </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 min-w-[200px]">Item Description</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Physical Stock</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Avg Unit Cost</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Total Value</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
                ) : filteredBalances.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500 font-medium">No inventory records found. Add items to start.</TableCell></TableRow>
                ) : (
                  filteredBalances.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-800">{b.productName}</TableCell>
                      <TableCell className="text-right font-bold text-lg">{b.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-slate-600">Rs. {Number(b.avgCost).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-black text-indigo-600">
                        Rs. {(Number(b.quantity) * Number(b.avgCost)).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {b.quantity <= 0 ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 shadow-sm">Critical: Empty</Badge>
                        ) : b.quantity <= 5 ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 shadow-sm">Warning: Low</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm">Optimal</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50/80 border-b pb-4"><CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5" /> Recent Stock Movements</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Value Impact</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 15).map((e) => (
                  <TableRow key={e.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{e.productName}</TableCell>
                    <TableCell>
                      {e.reason === "TRANSFER_TO_SHOP" ? (
                         <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 shadow-sm"><ArrowRightLeft className="h-3 w-3 mr-1 inline"/> SHOP TRANSFER</Badge>
                      ) : (
                         <Badge className={`shadow-sm ${e.type === "IN" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200"}`}>
                           {e.type === "IN" ? "STOCK IN" : "STOCK OUT"}
                         </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">{e.quantity}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-600">Rs. {Number(e.totalValue).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={e.note}>{e.note || e.reason || "-"}</TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-400 font-medium">No movement history available.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Cash In/Out tab - Enterprise Ledger
// ============================================================
function GodamCashTab() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ type: "IN", amount: "", category: "misc", note: "" });

  const loadTxns = async () => {
    try {
      setLoading(true);
      const res = await godamFetch("/cash");
      setTxns(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTxns(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!form.amount || Number(form.amount) <= 0) return setError("Valid amount is required.");

    try {
      setSaving(true);
      const res = await godamFetch("/cash", { method: "POST", body: JSON.stringify(form) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Transaction failed");
      
      await loadTxns();
      setForm({ type: "IN", amount: "", category: "misc", note: "" });
      
      setSuccess("Transaction posted to ledger successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <Card className="lg:col-span-1 h-fit shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/80 border-b pb-4">
           <CardTitle className="text-lg">Financial Entry</CardTitle>
           <CardDescription>Log Godam specific expenses/income</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0"/> {error}</div>}
            {success && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0"/> {success}</div>}

            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button type="button" onClick={() => { setForm({ ...form, type: "IN" }); setError(""); setSuccess(""); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-xs font-bold transition-all ${form.type === "IN" ? "bg-white shadow-sm text-emerald-600 ring-1 ring-emerald-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>
                <ArrowDownCircle className="h-5 w-5 mb-1" /> FUND IN
              </button>
              <button type="button" onClick={() => { setForm({ ...form, type: "OUT" }); setError(""); setSuccess(""); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-md px-2 py-3 text-xs font-bold transition-all ${form.type === "OUT" ? "bg-white shadow-sm text-rose-600 ring-1 ring-rose-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>
                <ArrowUpCircle className="h-5 w-5 mb-1" /> FUND OUT
              </button>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Transaction Amount (Rs) <span className="text-rose-500">*</span></Label>
              <Input type="number" min="0" className="h-11 font-bold text-lg border-slate-300 focus-visible:ring-indigo-500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00"/>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Expense / Income Category</Label>
              <select className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CASH_CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase().replace("_", " ")}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Remarks / Note</Label>
              <Input className="h-11 border-slate-300 focus-visible:ring-indigo-500" placeholder="Particulars..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>

            <Button type="submit" className={`w-full h-12 text-base font-bold shadow-lg transition-colors ${form.type === "IN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`} disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Wallet className="h-5 w-5 mr-2" />}
              Post to Ledger
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/80 border-b pb-4"><CardTitle className="text-lg">Vault Ledger</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Cash Flow</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead className="text-right">Net Value</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : txns.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500 font-medium">Ledger is empty.</TableCell></TableRow>
              ) : (
                txns.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={`shadow-sm ${t.type === "IN" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-rose-100 text-rose-800 border-rose-200"}`}>{t.type}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 text-xs tracking-wider">{t.category.toUpperCase().replace("_", " ")}</TableCell>
                    <TableCell className={`text-right font-black text-lg whitespace-nowrap ${t.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.type === "IN" ? "+" : "-"} Rs. {Number(t.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 max-w-[200px] truncate" title={t.note}>{t.note || "-"}</TableCell>
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

// ============================================================
// P&L Reports tab - Advanced Analytics
// ============================================================
function GodamReportsTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await godamFetch(`/reports/pnl?${params.toString()}`);
      setReport(res.ok ? await res.json() : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/80 border-b pb-4"><CardTitle className="text-lg">Godam Profitability Analytics</CardTitle></CardHeader>
        <CardContent className="p-6 flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">Start Date</Label>
            <Input type="date" className="h-11 font-medium border-slate-300" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">End Date</Label>
            <Input type="date" className="h-11 font-medium border-slate-300" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={runReport} className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <TrendingUp className="h-5 w-5 mr-2" />}
            Execute Analysis
          </Button>
          <Button variant="outline" className="h-11 px-6 border-slate-300" onClick={() => window.print()}>
            Print / Export
          </Button>
        </CardContent>
      </Card>

      {loading && <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}

      {!loading && report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="shadow-sm border-emerald-100 bg-emerald-50/30"><CardContent className="p-6">
              <p className="text-sm font-bold text-slate-600 mb-1">Gross Inflow</p>
              <p className="text-3xl font-black text-emerald-600 truncate">Rs. {Number(report.totalIn).toLocaleString()}</p>
            </CardContent></Card>
            <Card className="shadow-sm border-rose-100 bg-rose-50/30"><CardContent className="p-6">
              <p className="text-sm font-bold text-slate-600 mb-1">Gross Outflow (Expenditure)</p>
              <p className="text-3xl font-black text-rose-600 truncate">Rs. {Number(report.totalOut).toLocaleString()}</p>
            </CardContent></Card>
            <Card className={`shadow-sm border-t-4 ${report.netProfitLoss >= 0 ? "border-t-emerald-500" : "border-t-rose-500"}`}><CardContent className="p-6">
              <p className="text-sm font-bold text-slate-600 mb-1">Net Godam Yield</p>
              <p className={`text-3xl font-black truncate ${report.netProfitLoss >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                Rs. {Number(report.netProfitLoss).toLocaleString()}
              </p>
            </CardContent></Card>
          </div>

          <Card className="shadow-md border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b pb-4"><CardTitle className="text-lg">Expense Allocation Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold">Cost Center / Category</TableHead>
                    <TableHead className="text-right font-bold">Total Credits</TableHead>
                    <TableHead className="text-right font-bold">Total Debits</TableHead>
                    <TableHead className="text-right font-bold">Net Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(report.byCategory || {}).map(([cat, val]: any) => (
                    <TableRow key={cat} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-700 text-xs tracking-wider uppercase">{cat.replace("_", " ")}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">Rs. {Number(val.in).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-600">Rs. {Number(val.out).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-black text-slate-800">Rs. {Number(val.in - val.out).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(report.byCategory || {}).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500 font-medium">No financial footprint for this period.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// System Audit Logs Tab (For Security)
// ============================================================
function GodamAuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await godamFetch("/activity");
        if(res.ok) {
           setLogs(await res.json());
        }
      } catch (e) {
        console.error("Audit log error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
     <div className="space-y-6 animate-in fade-in duration-300">
       <Card className="shadow-md border-slate-200">
         <CardHeader className="bg-slate-50/80 border-b pb-4">
           <CardTitle className="text-lg flex items-center gap-2 text-rose-700">
              <ShieldCheck className="h-5 w-5" /> Strict Security Audit Trail
           </CardTitle>
           <CardDescription>Immutable record of all Godam portal interactions and stock modifications.</CardDescription>
         </CardHeader>
         <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                 <TableRow>
                   <TableHead className="min-w-[150px]">Time & Date</TableHead>
                   <TableHead>Event Trigger</TableHead>
                   <TableHead>Detailed Description</TableHead>
                   <TableHead className="text-right min-w-[150px]">Authorized By</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {loading ? (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
                 ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-500 font-medium">System awaits first audit event log.</TableCell></TableRow>
                 ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs font-bold text-slate-600 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-bold uppercase tracking-wider text-[10px] shadow-sm whitespace-nowrap">
                            {log.action.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-800">{log.detail}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-500 flex items-center justify-end gap-1">
                           <Eye className="h-3 w-3" /> {log.createdBy || "System Admin"}
                        </TableCell>
                      </TableRow>
                    ))
                 )}
              </TableBody>
            </Table>
         </CardContent>
       </Card>
     </div>
  )
}