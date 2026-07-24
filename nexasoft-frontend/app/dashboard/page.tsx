"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Loader2,
  ReceiptText,
  PackagePlus,
  Plus,
  ScanLine
} from "lucide-react";

// ---------- Static Chart Data (Visual Appeal) ----------
const salesChart = [
  { day: "Mon", value: 32 },
  { day: "Tue", value: 48 },
  { day: "Wed", value: 40 },
  { day: "Thu", value: 62 },
  { day: "Fri", value: 55 },
  { day: "Sat", value: 78 },
  { day: "Sun", value: 68 },
];

const purchaseChart = [
  { day: "Mon", value: 20 },
  { day: "Tue", value: 34 },
  { day: "Wed", value: 28 },
  { day: "Thu", value: 45 },
  { day: "Fri", value: 30 },
  { day: "Sat", value: 52 },
  { day: "Sun", value: 38 },
];

function MiniBarChart({
  data,
  barColor,
}: {
  data: { day: string; value: number }[];
  barColor: string;
}) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex h-40 items-end justify-between gap-3 px-1">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end">
            <div
              className={`w-full rounded-t-md ${barColor} transition-all`}
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${d.day}: ${d.value}`}
            />
          </div>
          <span className="text-xs font-medium text-slate-400">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Main Component ----------
export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch API Data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("http://localhost:4000/dashboard/summary");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500">Tayyab & Hassan Traders Business Summary</p>
        </div>

        {/* Top Cards (Dynamic Data from API) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Sales */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Banknote className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-emerald-600">Today</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">Rs. {data?.totalSales?.toLocaleString() || 0}</p>
            <p className="text-sm text-slate-500">Total Sales</p>
          </div>

          {/* Profit */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-emerald-600">Today</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">Rs. {data?.totalProfit?.toLocaleString() || 0}</p>
            <p className="text-sm text-slate-500">Total Profit</p>
          </div>

          {/* Invoices */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-blue-600">Today</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{data?.recentSales?.length || 0}</p>
            <p className="text-sm text-slate-500">Invoices Generated</p>
          </div>

          {/* Low Stock */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-rose-600">Action Needed</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{data?.lowStockProducts?.length || 0}</p>
            <p className="text-sm text-slate-500">Low Stock Items</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Sales Chart</h2>
              <span className="text-xs text-slate-400">Last 7 days</span>
            </div>
            <MiniBarChart data={salesChart} barColor="bg-teal-500" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Purchase Chart</h2>
              <span className="text-xs text-slate-400">Last 7 days</span>
            </div>
            <MiniBarChart data={purchaseChart} barColor="bg-indigo-500" />
          </div>
        </div>

        {/* Tables (Dynamic Data from API) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          
          {/* Recent Sales Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-medium">Invoice #</th>
                    <th className="pb-2 pr-3 font-medium">Customer</th>
                    <th className="pb-2 pr-3 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentSales?.map((sale: any) => (
                    <tr key={sale.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-3 font-medium text-indigo-600">{sale.invoice_number}</td>
                      <td className="py-3 pr-3 text-slate-600">{sale.customer?.name || "Walk-in"}</td>
                      <td className="py-3 pr-3 font-bold text-slate-800">Rs. {Number(sale.total_amount).toLocaleString()}</td>
                      <td className="py-3 text-slate-500">{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    </tr>
                  ))}
                  {data?.recentSales?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">No sales yet today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Low Stock Alerts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-medium">Product Name</th>
                    <th className="pb-2 pr-3 font-medium">Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.lowStockProducts?.map((product: any) => (
                    <tr key={product.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-3 font-medium text-slate-800">{product.name}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                          <AlertTriangle className="h-3 w-3" />
                          {product.opening_stock} Left
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data?.lowStockProducts?.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500">All products have sufficient stock!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <a href="/pos" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
              <ReceiptText className="h-4 w-4" />
              New Sale (POS)
            </a>
            <a href="/products" className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
              <PackagePlus className="h-4 w-4" />
              Add Product
            </a>
            <a href="/purchases" className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900">
              <Plus className="h-4 w-4" />
              New Purchase
            </a>
            <a href="/serial" className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <ScanLine className="h-4 w-4" />
              Track Serial
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}