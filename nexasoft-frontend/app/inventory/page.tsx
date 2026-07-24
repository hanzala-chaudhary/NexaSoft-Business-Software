"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  Boxes,
  PackageCheck,
  PackageX,
  AlertTriangle,
  Filter,
  Loader2, // Loader add kiya hai jab tak API se data aaye
} from "lucide-react";

// ---------- Types ----------

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

interface InventoryItem {
  id: string;
  product: string; 
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  currentStock: number;
  reserved: number;
}

const LOW_STOCK_THRESHOLD = 15;

function getStatus(currentStock: number): StockStatus {
  if (currentStock === 0) return "Out of Stock";
  if (currentStock <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
}

const statusStyles: Record<StockStatus, string> = {
  "In Stock": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Low Stock": "bg-amber-50 text-amber-700 ring-amber-600/20",
  "Out of Stock": "bg-rose-50 text-rose-700 ring-rose-600/20",
};

// ---------- Main Component ----------

export default function Inventory() {
  // Data States
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("All");

  // ---------- API SE DATA FETCH KARNA ----------
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // NEXT_PUBLIC_API_URL Vercel/Localhost se aayega
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"; 
        
        // Note: Yahan '/products' ki jagah agar aapke backend ka route '/inventory' hai toh wo likhiye ga
        const response = await fetch(`${apiUrl}/products`); 
        
        if (!response.ok) {
          throw new Error("Failed to fetch data from database");
        }

        const data = await response.json();
        
        // Backend ka data state mein save kar rahe hain
        setAllItems(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Database se aane wali unique Categories aur Brands nikalne ke liye
  const uniqueCategories = useMemo(() => {
    const cats = new Set(allItems.map((item) => item.category).filter(Boolean));
    return Array.from(cats);
  }, [allItems]);

  const uniqueBrands = useMemo(() => {
    const brnds = new Set(allItems.map((item) => item.brand).filter(Boolean));
    return Array.from(brnds);
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesQuery =
        !q ||
        item.product?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q);
      const matchesCategory = category === "All" || item.category === category;
      const matchesBrand = brand === "All" || item.brand === brand;
      return matchesQuery && matchesCategory && matchesBrand;
    });
  }, [query, category, brand, allItems]);

  const summary = useMemo(() => {
    const totalStock = allItems.reduce((sum, i) => sum + (i.currentStock || 0), 0);
    const totalReserved = allItems.reduce((sum, i) => sum + (i.reserved || 0), 0);
    const lowStockCount = allItems.filter(
      (i) => getStatus(i.currentStock || 0) === "Low Stock"
    ).length;
    const outOfStockCount = allItems.filter(
      (i) => getStatus(i.currentStock || 0) === "Out of Stock"
    ).length;
    return { totalStock, totalReserved, lowStockCount, outOfStockCount };
  }, [allItems]);

  const summaryCards = [
    {
      label: "Total Stock",
      value: summary.totalStock.toLocaleString(),
      icon: Boxes,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Available",
      value: (summary.totalStock - summary.totalReserved).toLocaleString(),
      icon: PackageCheck,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Low Stock",
      value: summary.lowStockCount.toString(),
      icon: AlertTriangle,
      accent: "bg-amber-50 text-amber-600",
    },
    {
      label: "Out of Stock",
      value: summary.outOfStockCount.toString(),
      icon: PackageX,
      accent: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Track stock levels across your catalog</p>
        </div>

        {/* Loading & Error States */}
        {isLoading && (
          <div className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <span className="ml-3 text-slate-500">Loading live data...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-600 shadow-sm">
            Error: {error}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Stock Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-bold text-slate-900">{card.value}</p>
                    <p className="text-sm text-slate-500">{card.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by product, SKU, barcode..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-slate-400">
                  <Filter className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
                </div>
                
                {/* Dynamic Categories Dropdown */}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                
                {/* Dynamic Brands Dropdown */}
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="All">All Brands</option>
                  {uniqueBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Barcode</th>
                      <th className="px-4 py-3 font-medium">Current Stock</th>
                      <th className="px-4 py-3 font-medium">Reserved</th>
                      <th className="px-4 py-3 font-medium">Available</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const status = getStatus(item.currentStock || 0);
                      const available = (item.currentStock || 0) - (item.reserved || 0);
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                            {item.product}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.sku}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.barcode}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.currentStock || 0}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.reserved || 0}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                            {available}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Agar Database Khali Hai */}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                          {allItems.length === 0 
                            ? "Godam bilkul khali hai. Koi product add nahi ki gayi." 
                            : "No inventory items match your search or filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-medium text-slate-700">{filtered.length}</span> of{" "}
                  <span className="font-medium text-slate-700">{allItems.length}</span> items
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}