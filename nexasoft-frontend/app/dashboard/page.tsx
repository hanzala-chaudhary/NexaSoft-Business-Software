"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, ExternalLink, Calendar, User, ShoppingCart, Plus, Tag, ScanBarcode,
  Banknote, TrendingUp, ShoppingBag, CalendarDays 
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const SHOP = {
  name: "Tayyab & Hassan Traders",
  tagline: "Importer & Distributor of Computer Parts",
  phones: "0323-4072182 | 0328-1828034",
};

export default function DashboardPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [salesRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/sales`),
        fetch(`${API_URL}/products`)
      ]);
      if (salesRes.ok) setSales(await salesRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayEnd = new Date(today);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const getSalesInRange = (startDate: Date, endDate: Date) => {
    return sales.filter((s) => {
      const d = new Date(s.created_at);
      return d >= startDate && d < endDate;
    });
  };

  // Real profit — har item ki asal purchase price se hisaab, koi fixed % nahi
  const calcRealProfit = (salesList: any[]) => {
    let profit = 0;
    salesList.forEach((sale) => {
      (sale.items || []).forEach((item: any) => {
        const cost = Number(item.product?.purchasePrice || 0);
        const price = Number(item.sale_price || 0);
        const qty = Number(item.quantity || 0);
        profit += (price - cost) * qty;
      });
    });
    return profit;
  };

  const todaySalesList = getSalesInRange(today, todayEnd);
  const thisMonthSalesList = getSalesInRange(firstDayOfMonth, todayEnd);

  const todaySales = todaySalesList.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const todayCount = todaySalesList.length;
  const todayProfit = calcRealProfit(todaySalesList);

  const thisMonthSales = thisMonthSalesList.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const thisMonthCount = thisMonthSalesList.length;
  const thisMonthProfit = calcRealProfit(thisMonthSalesList);

  const lowStockProducts = products.filter(p => Number(p.opening_stock) <= 5);

  const handleRowClick = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/sales/${id}`);
      if (!res.ok) throw new Error("Failed to fetch sale details");
      const data = await res.json();
      setSelectedSale(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      alert("Invoice load nahi ho saki!");
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back to {SHOP.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Today's Revenue</p>
              <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <Banknote className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">
              Rs. {todaySales.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ShoppingBag className="h-3 w-3 text-emerald-500" />
              <span className="font-bold text-slate-700">{todayCount}</span> Invoices generated today
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Today's Profit</p>
              <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className={`text-3xl font-black mt-2 ${todayProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              Rs. {todayProfit.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Asal purchase price ke mutabiq (koi estimate nahi)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue</p>
              <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">
              Rs. {thisMonthSales.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ShoppingBag className="h-3 w-3 text-emerald-500" />
              <span className="font-bold text-slate-700">{thisMonthCount}</span> Invoices this month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Monthly Profit</p>
              <div className="h-10 w-10 bg-violet-50 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
            </div>
            <div className={`text-3xl font-black mt-2 ${thisMonthProfit < 0 ? "text-rose-600" : "text-violet-600"}`}>
              Rs. {thisMonthProfit.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Asal purchase price ke mutabiq (koi estimate nahi)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-slate-200 flex flex-col bg-white">
          <CardHeader className="border-b bg-transparent">
            <CardTitle className="text-lg flex items-center justify-between text-slate-800">
              <span>Recent Transactions</span>
              <Link href="/sales">
                <Button variant="link" className="text-indigo-600 font-semibold text-sm p-0">View All Sales &rarr;</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="font-bold text-slate-600">INVOICE #</TableHead>
                  <TableHead className="font-bold text-slate-600">CUSTOMER</TableHead>
                  <TableHead className="text-right font-bold text-slate-600">AMOUNT</TableHead>
                  <TableHead className="text-right font-bold text-slate-600">TIME</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
                ) : sales.slice(0, 10).map((sale) => (
                  <TableRow 
                    key={sale.id} 
                    className="cursor-pointer hover:bg-indigo-50/60 transition-colors group"
                    onClick={() => handleRowClick(sale.id)}
                  >
                    <TableCell>
                      <span className="font-mono font-medium text-indigo-600 group-hover:underline">{sale.invoice_number}</span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{sale.customer?.name || "Walk-in"}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">Rs. {Number(sale.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-slate-500 text-sm">
                      {new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 flex flex-col bg-white">
          <CardHeader className="border-b bg-rose-50/50">
            <CardTitle className="text-lg text-rose-700 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-slate-600">PRODUCT NAME</TableHead>
                  <TableHead className="text-right font-bold text-slate-600">STOCK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={2} className="h-20 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-rose-400" /></TableCell></TableRow>
                ) : lowStockProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="h-32 text-center text-slate-400 font-medium">All products have sufficient stock!</TableCell></TableRow>
                ) : (
                  lowStockProducts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-slate-700 line-clamp-1" title={p.name}>{p.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="font-bold px-2 py-1 shadow-sm">{p.opening_stock}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/pos" className="w-full">
          <Button className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-base font-bold shadow-sm gap-2 transition-all hover:-translate-y-0.5">
            <ShoppingCart className="h-5 w-5" /> New Sale (POS)
          </Button>
        </Link>
        <Link href="/products" className="w-full">
          <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-sm gap-2 transition-all hover:-translate-y-0.5">
            <Tag className="h-5 w-5" /> Add Product
          </Button>
        </Link>
        <Link href="/purchases" className="w-full">
          <Button className="w-full h-14 bg-slate-800 hover:bg-slate-900 text-base font-bold shadow-sm gap-2 transition-all hover:-translate-y-0.5">
            <Plus className="h-5 w-5" /> New Purchase
          </Button>
        </Link>
        <Link href="/products" className="w-full">
          <Button variant="outline" className="w-full h-14 text-base font-bold border-slate-300 hover:bg-slate-100 shadow-sm gap-2 text-slate-700 transition-all hover:-translate-y-0.5">
            <ScanBarcode className="h-5 w-5" /> Track Serial
          </Button>
        </Link>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl flex items-center justify-between">
              <span>Invoice Overview</span>
              <Badge variant="outline" className="font-mono text-sm bg-slate-100">{selectedSale?.invoice_number}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedSale ? (
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-inner">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" /> Customer</p>
                  <p className="font-bold text-slate-800">{selectedSale.customer?.name || "Walk-in Customer"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center justify-end gap-1"><Calendar className="h-3 w-3" /> Time</p>
                  <p className="font-bold text-slate-800">{new Date(selectedSale.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Items Summary</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedSale.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                      <div>
                        <p className="font-semibold text-sm text-slate-900 line-clamp-1">{item.product?.name || "Unknown Product"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.quantity} x Rs. {Number(item.sale_price).toLocaleString()}</p>
                      </div>
                      <p className="font-bold text-sm text-slate-900">Rs. {(Number(item.sale_price) * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
          )}

          <div className="border-t pt-4 space-y-4 bg-white">
            <div className="flex justify-between items-center px-2">
              <span className="text-lg font-bold text-slate-600">Total</span>
              <span className="text-3xl font-black text-indigo-700">Rs. {Number(selectedSale?.total_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 font-bold" onClick={() => setIsModalOpen(false)}>Close</Button>
              <Link href="/sales" className="flex-1">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold shadow-md">
                  <ExternalLink className="h-4 w-4" /> Full Details
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}