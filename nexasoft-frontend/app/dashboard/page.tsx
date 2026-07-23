import React from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Boxes,
  AlertTriangle,
  Users,
  Truck,
  Plus,
  ScanLine,
  PackagePlus,
  ReceiptText,
} from "lucide-react";

// ---------- Dummy Data ----------

interface StatCard {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: React.ElementType;
  accent: string; // tailwind color token for icon chip
}

const statCards: StatCard[] = [
  {
    label: "Today's Sales",
    value: "$4,286",
    delta: "+12.4%",
    positive: true,
    icon: DollarSign,
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Today's Purchases",
    value: "$1,940",
    delta: "+3.1%",
    positive: true,
    icon: ShoppingCart,
    accent: "bg-sky-50 text-sky-600",
  },
  {
    label: "Today's Profit",
    value: "$2,346",
    delta: "+18.7%",
    positive: true,
    icon: TrendingUp,
    accent: "bg-teal-50 text-teal-600",
  },
  {
    label: "Total Products",
    value: "1,284",
    delta: "+6 new",
    positive: true,
    icon: Package,
    accent: "bg-indigo-50 text-indigo-600",
  },
  {
    label: "Total Stock",
    value: "38,502",
    delta: "units",
    positive: true,
    icon: Boxes,
    accent: "bg-violet-50 text-violet-600",
  },
  {
    label: "Low Stock",
    value: "17",
    delta: "needs reorder",
    positive: false,
    icon: AlertTriangle,
    accent: "bg-amber-50 text-amber-600",
  },
  {
    label: "Customers",
    value: "962",
    delta: "+24 this week",
    positive: true,
    icon: Users,
    accent: "bg-rose-50 text-rose-600",
  },
  {
    label: "Suppliers",
    value: "58",
    delta: "+2 this month",
    positive: true,
    icon: Truck,
    accent: "bg-cyan-50 text-cyan-600",
  },
];

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

interface RecentSale {
  id: string;
  customer: string;
  items: number;
  total: string;
  status: "Paid" | "Pending" | "Refunded";
  time: string;
}

const recentSales: RecentSale[] = [
  { id: "INV-2041", customer: "Amina Rauf", items: 3, total: "$128.50", status: "Paid", time: "10:24 AM" },
  { id: "INV-2040", customer: "Hamza Tariq", items: 1, total: "$42.00", status: "Paid", time: "09:58 AM" },
  { id: "INV-2039", customer: "Sara Iqbal", items: 5, total: "$310.75", status: "Pending", time: "09:41 AM" },
  { id: "INV-2038", customer: "Bilal Ahmed", items: 2, total: "$76.20", status: "Paid", time: "09:15 AM" },
  { id: "INV-2037", customer: "Mehak Noor", items: 4, total: "$198.00", status: "Refunded", time: "08:52 AM" },
];

interface LowStockItem {
  sku: string;
  name: string;
  category: string;
  inStock: number;
  reorderLevel: number;
}

const lowStockProducts: LowStockItem[] = [
  { sku: "SKU-1042", name: "Wireless Mouse M1", category: "Electronics", inStock: 4, reorderLevel: 15 },
  { sku: "SKU-2210", name: "A4 Copy Paper (Ream)", category: "Stationery", inStock: 8, reorderLevel: 25 },
  { sku: "SKU-3305", name: "USB-C Cable 1m", category: "Electronics", inStock: 6, reorderLevel: 20 },
  { sku: "SKU-4118", name: "Stapler Heavy Duty", category: "Stationery", inStock: 3, reorderLevel: 10 },
  { sku: "SKU-5027", name: "LED Desk Lamp", category: "Home", inStock: 5, reorderLevel: 12 },
];

// ---------- Small UI helpers ----------

const statusStyles: Record<RecentSale["status"], string> = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Refunded: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

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

export default function Dashboard() {
  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of today&apos;s store performance</p>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      card.positive ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {card.delta}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            );
          })}
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

        {/* Tables */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent Sales */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent Sales</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-medium">Invoice</th>
                    <th className="pb-2 pr-3 font-medium">Customer</th>
                    <th className="pb-2 pr-3 font-medium">Items</th>
                    <th className="pb-2 pr-3 font-medium">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-3 font-medium text-slate-800">{sale.id}</td>
                      <td className="py-3 pr-3 text-slate-600">{sale.customer}</td>
                      <td className="py-3 pr-3 text-slate-600">{sale.items}</td>
                      <td className="py-3 pr-3 font-medium text-slate-800">{sale.total}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            statusStyles[sale.status]
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Low Stock Products</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-medium">SKU</th>
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 pr-3 font-medium">Category</th>
                    <th className="pb-2 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((item) => (
                    <tr key={item.sku} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-3 text-slate-500">{item.sku}</td>
                      <td className="py-3 pr-3 font-medium text-slate-800">{item.name}</td>
                      <td className="py-3 pr-3 text-slate-600">{item.category}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          <AlertTriangle className="h-3 w-3" />
                          {item.inStock}/{item.reorderLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700">
              <ReceiptText className="h-4 w-4" />
              New Sale
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
              <PackagePlus className="h-4 w-4" />
              Add Product
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900">
              <Plus className="h-4 w-4" />
              New Purchase
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <ScanLine className="h-4 w-4" />
              Scan Serial Number
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}