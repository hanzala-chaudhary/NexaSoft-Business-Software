"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const GODAM_TOKEN_KEY = "godam_access_token";

const CASH_CATEGORIES = ["rent", "labour", "transport", "utility", "stock_purchase", "dispatch_sale", "misc"];

type Tab = "dashboard" | "stock" | "cash" | "reports";

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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!unlocked) {
    return <GodamLockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <GodamDashboardShell onLock={() => { sessionStorage.removeItem(GODAM_TOKEN_KEY); setUnlocked(false); }} />;
}

// ============================================================
// Lock screen
// ============================================================
function GodamLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) return setError("Password enter karein");

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/godam/verify-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Galat password!");

      sessionStorage.setItem(GODAM_TOKEN_KEY, data.token);
      onUnlock();
    } catch (err: any) {
      setError(err.message || "Kuch ghalat ho gaya");
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm shadow-lg border-slate-200">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <Warehouse className="h-7 w-7 text-indigo-600" />
          </div>
          <CardTitle className="text-xl">गोदाम — Protected Area</CardTitle>
          <p className="text-sm text-slate-500">Ye section alag password se protected hai.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 text-center">{error}</div>}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Godam Password</Label>
              <Input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Unlock Godam
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Shell — unlock hone ke baad tabs
// ============================================================
function GodamDashboardShell({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: Warehouse },
    { id: "stock", label: "Stock In/Out", icon: Package },
    { id: "cash", label: "Cash In/Out", icon: Wallet },
    { id: "reports", label: "P&L Reports", icon: TrendingUp },
  ];

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-indigo-600" /> गोदाम
          </h1>
          <p className="text-sm text-slate-500">Independent stock aur cash system — main shop se link nahi hai.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onLock}>
          <Lock className="h-4 w-4 mr-2" /> Lock
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <GodamDashboardTab />}
      {tab === "stock" && <GodamStockTab />}
      {tab === "cash" && <GodamCashTab />}
      {tab === "reports" && <GodamReportsTab />}
    </div>
  );
}

// ============================================================
// Shared fetch helper — token header attach karta hai
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
    window.location.reload(); // session expire — dobara lock screen dikhao
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
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>;
  }

  const cards = [
    { label: "Total Stock Value", value: `Rs. ${Number(data?.totalStockValue || 0).toLocaleString()}`, icon: Package, color: "indigo" },
    { label: "Cash Balance", value: `Rs. ${Number(data?.cashBalance || 0).toLocaleString()}`, icon: Wallet, color: "emerald" },
    { label: "Net Profit / Loss", value: `Rs. ${Number(data?.netProfitLoss || 0).toLocaleString()}`, icon: data?.netProfitLoss >= 0 ? TrendingUp : TrendingDown, color: data?.netProfitLoss >= 0 ? "emerald" : "rose" },
    { label: "Low / Out of Stock", value: `${(data?.lowStockItems || 0) + (data?.outOfStockItems || 0)} items`, icon: AlertTriangle, color: "amber" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-slate-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">{c.label}</p>
              <p className={`text-xl font-bold text-${c.color}-600`}>{c.value}</p>
            </div>
            <div className={`h-10 w-10 rounded-full bg-${c.color}-50 flex items-center justify-center`}>
              <c.icon className={`h-5 w-5 text-${c.color}-600`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// Stock In/Out tab
// ============================================================
function GodamStockTab() {
  const [balances, setBalances] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ productId: "", type: "IN", quantity: "", unitCost: "", reason: "", note: "" });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [balRes, entRes, prodRes] = await Promise.all([
        godamFetch("/stock"),
        godamFetch("/stock/entries"),
        fetch(`${API_URL}/products`), // products list reuse — sirf naam ke liye
      ]);
      setBalances(balRes.ok ? await balRes.json() : []);
      setEntries(entRes.ok ? await entRes.json() : []);
      const prodData = prodRes.ok ? await prodRes.json() : [];
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.productId) return setError("Product select karein");
    if (!form.quantity || Number(form.quantity) <= 0) return setError("Quantity 0 se zyada honi chahiye");
    if (form.type === "IN" && (!form.unitCost || Number(form.unitCost) < 0)) return setError("Unit cost enter karein");

    const selectedProduct = products.find((p) => p.id === form.productId);

    try {
      setSaving(true);
      const res = await godamFetch("/stock", {
        method: "POST",
        body: JSON.stringify({
          productId: form.productId,
          productName: selectedProduct?.name || "Unknown",
          type: form.type,
          quantity: Number(form.quantity),
          unitCost: Number(form.unitCost) || 0,
          reason: form.reason,
          note: form.note,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Save nahi ho saka");

      await loadAll();
      setForm({ productId: "", type: "IN", quantity: "", unitCost: "", reason: "", note: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <CardHeader><CardTitle className="text-base">Stock Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "IN" })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${
                  form.type === "IN" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-500"
                }`}
              >
                <ArrowDownCircle className="h-4 w-4" /> Stock IN
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "OUT" })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${
                  form.type === "OUT" ? "bg-rose-50 border-rose-300 text-rose-700" : "border-slate-200 text-slate-500"
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" /> Stock OUT
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Product</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Cost (Rs) {form.type === "OUT" && <span className="text-xs text-slate-400">(optional)</span>}</Label>
                <Input type="number" min="0" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input placeholder="e.g. purchase, transfer, damaged" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : form.type === "IN" ? <PlusCircle className="h-4 w-4 mr-2" /> : <MinusCircle className="h-4 w-4 mr-2" />}
              Save Entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Current Stock Balance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
                ) : balances.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-400">Abhi tak koi stock nahi.</TableCell></TableRow>
                ) : (
                  balances.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.productName}</TableCell>
                      <TableCell className="text-right">{b.quantity}</TableCell>
                      <TableCell className="text-right">Rs. {Number(b.avgCost).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-indigo-600">
                        Rs. {(Number(b.quantity) * Number(b.avgCost)).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {b.quantity <= 0 ? (
                          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Out of Stock</Badge>
                        ) : b.quantity <= 5 ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-1.5"><History className="h-4 w-4" /> Recent Movements</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 15).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{e.productName}</TableCell>
                    <TableCell>
                      <Badge className={e.type === "IN" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-rose-100 text-rose-800 hover:bg-rose-100"}>
                        {e.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{e.quantity}</TableCell>
                    <TableCell className="text-right">Rs. {Number(e.totalValue).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-slate-500">{e.note || "-"}</TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={6} className="h-20 text-center text-slate-400">Koi movement nahi.</TableCell></TableRow>
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
// Cash In/Out tab
// ============================================================
function GodamCashTab() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
    if (!form.amount || Number(form.amount) <= 0) return setError("Amount 0 se zyada hona chahiye");

    try {
      setSaving(true);
      const res = await godamFetch("/cash", { method: "POST", body: JSON.stringify(form) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Save nahi ho saka");
      await loadTxns();
      setForm({ type: "IN", amount: "", category: "misc", note: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <CardHeader><CardTitle className="text-base">Cash Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, type: "IN" })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${form.type === "IN" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                <ArrowDownCircle className="h-4 w-4" /> Cash IN
              </button>
              <button type="button" onClick={() => setForm({ ...form, type: "OUT" })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium ${form.type === "OUT" ? "bg-rose-50 border-rose-300 text-rose-700" : "border-slate-200 text-slate-500"}`}>
                <ArrowUpCircle className="h-4 w-4" /> Cash OUT
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Amount (Rs)</Label>
              <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CASH_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
              Save Entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Cash Ledger</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : txns.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-400">Koi cash entry nahi.</TableCell></TableRow>
              ) : (
                txns.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={t.type === "IN" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-rose-100 text-rose-800 hover:bg-rose-100"}>{t.type}</Badge>
                    </TableCell>
                    <TableCell className="capitalize text-slate-600">{t.category.replace("_", " ")}</TableCell>
                    <TableCell className={`text-right font-semibold ${t.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.type === "IN" ? "+" : "-"} Rs. {Number(t.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{t.note || "-"}</TableCell>
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
// P&L Reports tab
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
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={runReport} className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-5">
              <p className="text-xs text-slate-500 mb-1">Total Income</p>
              <p className="text-xl font-bold text-emerald-600">Rs. {Number(report.totalIn).toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs text-slate-500 mb-1">Total Expense</p>
              <p className="text-xl font-bold text-rose-600">Rs. {Number(report.totalOut).toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs text-slate-500 mb-1">Net Profit / Loss</p>
              <p className={`text-xl font-bold ${report.netProfitLoss >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                Rs. {Number(report.netProfitLoss).toLocaleString()}
              </p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Category-wise Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(report.byCategory || {}).map(([cat, val]: any) => (
                    <TableRow key={cat}>
                      <TableCell className="capitalize">{cat.replace("_", " ")}</TableCell>
                      <TableCell className="text-right text-emerald-600">Rs. {Number(val.in).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-rose-600">Rs. {Number(val.out).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">Rs. {Number(val.in - val.out).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(report.byCategory || {}).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="h-16 text-center text-slate-400">Is range mein koi data nahi.</TableCell></TableRow>
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