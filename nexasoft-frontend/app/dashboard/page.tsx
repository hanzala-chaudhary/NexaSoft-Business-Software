"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, ExternalLink, Calendar, User, ShoppingCart, Plus, Tag, ScanBarcode,
  Banknote, TrendingUp, ShoppingBag, CalendarDays, RefreshCcw, Users, ArrowUpRight, Activity, AlertCircle,
  CheckCircle2, FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

const SHOP = {
  name: "Tayyab & Hassan Traders",
  tagline: "Importer & Distributor of Computer Parts",
  phones: "0323-4072182 | 0328-1828034",
};

export default function DashboardPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => {
    fetchData();

    // Global Shortcuts for Command Center
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); router.push("/pos"); }
      if (e.key === "F3") { e.preventDefault(); router.push("/purchases"); }
      if (e.key === "F4") { e.preventDefault(); router.push("/customers"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const [salesRes, productsRes, customersRes] = await Promise.all([
        fetch(`${API_URL}/sales`),
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/customers`)
      ]);
      
      if (salesRes.ok) setSales(await salesRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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

  // Real profit calculation
  const calcRealProfit = (salesList: any[]) => {
    let profit = 0;
    salesList.forEach((sale) => {
      (sale.items || []).forEach((item: any) => {
        const cost = Number(item.product?.purchasePrice || 0);
        const price = Number(item.sale_price || 0);
        const qty = Number(item.quantity || 0);
        profit += (price - cost) * qty;
      });
      // Deduct overall invoice discount if any
      profit -= Number(sale.discount || 0);
    });
    return Math.max(0, profit); // Avoid negative global profit display anomalies unless extreme loss
  };

  const todaySalesList = getSalesInRange(today, todayEnd);
  const thisMonthSalesList = getSalesInRange(firstDayOfMonth, todayEnd);

  // Today's Stats
  const todaySales = todaySalesList.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const todayPaid = todaySalesList.reduce((sum, s) => sum + Number(s.paid_amount), 0);
  const todayUdhaar = Math.max(0, todaySales - todayPaid);
  const todayCount = todaySalesList.length;
  const todayProfit = calcRealProfit(todaySalesList);
  const todayMargin = todaySales > 0 ? ((todayProfit / todaySales) * 100).toFixed(1) : "0.0";

  // Monthly Stats
  const thisMonthSales = thisMonthSalesList.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const thisMonthCount = thisMonthSalesList.length;
  const thisMonthProfit = calcRealProfit(thisMonthSalesList);
  const thisMonthMargin = thisMonthSales > 0 ? ((thisMonthProfit / thisMonthSales) * 100).toFixed(1) : "0.0";

  // Global Market Debt
  const totalMarketUdhaar = customers.reduce((sum, c) => sum + Number(c.totalOutstanding || 0), 0);

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
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50 flex-col gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-bold animate-pulse">Initializing Cloud Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 lg:p-8 bg-slate-50 overflow-y-auto relative">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Activity className="h-8 w-8 text-indigo-600" />
            Command Center
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2 shadow-sm font-bold">Live Data</Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Welcome back to {SHOP.name}. Here is your business summary.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchData(true)} 
          className="bg-white border-slate-300 text-slate-700 font-bold hover:bg-slate-50 shadow-sm"
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> 
          {isRefreshing ? 'Syncing...' : 'Sync Cloud'}
        </Button>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Today Revenue */}
        <Card className="shadow-lg border-none bg-gradient-to-br from-indigo-500 to-blue-600 text-white hover:-translate-y-1 transition-transform">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2 opacity-80">
              <p className="text-xs font-bold uppercase tracking-widest">Today's Revenue</p>
              <Banknote className="h-6 w-6" />
            </div>
            <div className="text-4xl font-black mt-2 tracking-tight">
              Rs. {todaySales.toLocaleString()}
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-xs font-semibold">
              <span className="bg-white/20 px-2 py-1 rounded">Cash: Rs. {todayPaid.toLocaleString()}</span>
              <span className="bg-rose-500/80 px-2 py-1 rounded">Udhaar: Rs. {todayUdhaar.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Today Profit */}
        <Card className="shadow-lg border-none bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:-translate-y-1 transition-transform">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2 opacity-80">
              <p className="text-xs font-bold uppercase tracking-widest">Today's Profit</p>
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="text-4xl font-black mt-2 tracking-tight">
              Rs. {todayProfit.toLocaleString()}
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-xs font-semibold">
              <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {todayCount} Bills</span>
              <span className="bg-white/20 px-2 py-1 rounded">Margin: {todayMargin}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><CalendarDays className="h-24 w-24"/></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Sales</p>
              <div className="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">
              Rs. {thisMonthSales.toLocaleString()}
            </div>
            <div className="mt-4 flex flex-col gap-1 text-xs font-bold text-slate-500">
               <div className="flex justify-between">
                 <span>Estimated Profit:</span>
                 <span className="text-emerald-600">Rs. {thisMonthProfit.toLocaleString()}</span>
               </div>
               <div className="flex justify-between">
                 <span>Total Invoices:</span>
                 <span>{thisMonthCount}</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Receivables */}
        <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Users className="h-24 w-24"/></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Market Udhaar</p>
              <div className="h-8 w-8 bg-rose-50 rounded-full flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-rose-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-rose-600 mt-2">
              Rs. {totalMarketUdhaar.toLocaleString()}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
               <Link href="/customers">
                 <Button variant="link" className="p-0 h-auto text-xs font-bold text-indigo-600 w-full justify-start">
                   View Customer Ledgers &rarr;
                 </Button>
               </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK COMMAND CENTER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/pos" className="w-full">
          <Button className="w-full h-16 bg-slate-900 hover:bg-black text-base font-black shadow-lg gap-3 transition-transform hover:-translate-y-1 rounded-xl">
            <ShoppingCart className="h-5 w-5 text-emerald-400" /> NEW SALE (POS)
            <Badge className="bg-slate-700 text-white border-none ml-auto text-[10px]">F2</Badge>
          </Button>
        </Link>
        <Link href="/purchases" className="w-full">
          <Button className="w-full h-16 bg-white hover:bg-slate-50 text-slate-800 text-base font-black shadow-sm border-2 border-slate-200 gap-3 transition-transform hover:-translate-y-1 rounded-xl">
            <Plus className="h-5 w-5 text-indigo-600" /> NEW STOCK IN
            <Badge className="bg-slate-100 text-slate-500 border-none ml-auto text-[10px]">F3</Badge>
          </Button>
        </Link>
        <Link href="/customers" className="w-full">
          <Button className="w-full h-16 bg-white hover:bg-slate-50 text-slate-800 text-base font-black shadow-sm border-2 border-slate-200 gap-3 transition-transform hover:-translate-y-1 rounded-xl">
            <Users className="h-5 w-5 text-blue-600" /> KHATAY
            <Badge className="bg-slate-100 text-slate-500 border-none ml-auto text-[10px]">F4</Badge>
          </Button>
        </Link>
        <Link href="/products" className="w-full">
          <Button className="w-full h-16 bg-white hover:bg-slate-50 text-slate-800 text-base font-black shadow-sm border-2 border-slate-200 gap-3 transition-transform hover:-translate-y-1 rounded-xl">
            <ScanBarcode className="h-5 w-5 text-amber-600" /> TRACK SERIAL
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT TRANSACTIONS */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 flex flex-col bg-white">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-extrabold uppercase tracking-widest text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-2"><Banknote className="h-5 w-5 text-indigo-500"/> Recent Sales</span>
              <Link href="/sales">
                <Button variant="link" className="text-indigo-600 font-bold text-xs p-0 uppercase">View History &rarr;</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[420px] custom-scrollbar">
            <Table>
              <TableHeader className="bg-white sticky top-0 z-10 shadow-sm border-b">
                <TableRow>
                  <TableHead className="font-bold text-slate-500 text-xs">INVOICE</TableHead>
                  <TableHead className="font-bold text-slate-500 text-xs">CUSTOMER</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 text-xs">AMOUNT</TableHead>
                  <TableHead className="text-center font-bold text-slate-500 text-xs">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice(0, 10).map((sale) => {
                   const isPaid = sale.payment_status === "PAID";
                   const isPartial = sale.payment_status === "PARTIAL";
                   return (
                    <TableRow 
                      key={sale.id} 
                      className="cursor-pointer hover:bg-indigo-50/60 transition-colors group h-14"
                      onClick={() => handleRowClick(sale.id)}
                    >
                      <TableCell>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{sale.invoice_number}</span>
                      </TableCell>
                      <TableCell>
                         <p className="font-bold text-slate-800">{sale.customer?.name || "Walk-in Counter"}</p>
                         <p className="text-[10px] text-slate-400 font-semibold">{new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900 text-base">
                         Rs. {Number(sale.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`font-bold uppercase tracking-wider text-[10px] ${isPaid ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : isPartial ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-rose-200 text-rose-700 bg-rose-50'}`}>
                           {sale.payment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                   )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* LOW STOCK ALERTS */}
        <Card className="shadow-sm border-slate-200 flex flex-col bg-white overflow-hidden">
          <CardHeader className="border-b bg-rose-50 pb-4">
            <CardTitle className="text-base font-extrabold uppercase tracking-widest text-rose-700 flex items-center justify-between">
              <span className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-rose-500 animate-pulse"/> Low Stock Alerts</span>
              <Badge className="bg-rose-200 text-rose-800 hover:bg-rose-200 border-none font-black">{lowStockProducts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[420px] custom-scrollbar">
            <Table>
              <TableHeader className="bg-white sticky top-0 z-10 border-b">
                <TableRow>
                  <TableHead className="font-bold text-slate-500 text-xs">PRODUCT NAME</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 text-xs">STOCK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="h-40 text-center text-slate-400 font-bold bg-emerald-50/30"><CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-300"/> All inventory optimal!</TableCell></TableRow>
                ) : (
                  lowStockProducts.map(p => (
                    <TableRow key={p.id} className="hover:bg-slate-50">
                      <TableCell className="py-3">
                         <p className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight" title={p.name}>{p.name}</p>
                         <Link href={`/purchases`} className="text-[10px] font-bold text-indigo-600 hover:underline mt-1 inline-block">Restock Now &rarr;</Link>
                      </TableCell>
                      <TableCell className="text-right align-top py-3">
                        <Badge variant="destructive" className={`font-black px-2.5 py-1 shadow-sm ${Number(p.opening_stock) <= 0 ? 'bg-rose-600' : 'bg-amber-500'}`}>
                           {p.opening_stock}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* INVOICE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-slate-50">
          <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
             <DialogTitle className="text-xl font-black flex items-center gap-2">
               <FileSpreadsheet className="h-5 w-5" /> Invoice Details
             </DialogTitle>
             <Badge variant="outline" className="font-mono text-sm border-indigo-300 text-indigo-100 bg-indigo-800">{selectedSale?.invoice_number}</Badge>
          </div>

          {selectedSale ? (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5"><ShoppingCart className="h-24 w-24"/></div>
                <div className="space-y-1 relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
                  <p className="font-extrabold text-slate-800 text-lg">{selectedSale.customer?.name || "Walk-in Counter"}</p>
                </div>
                <div className="space-y-1 text-right relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</p>
                  <p className="font-bold text-slate-800">{new Date(selectedSale.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider bg-slate-100 px-4 py-2 border-b border-slate-200">Purchased Items</h3>
                <div className="space-y-0 divide-y divide-slate-100 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {selectedSale.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-slate-900 line-clamp-1">{item.product?.name || "Unknown Product"}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                           <Badge variant="outline" className="bg-white font-mono text-[10px] mr-1">{item.quantity} Units</Badge> @ Rs. {Number(item.sale_price).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-black text-sm text-slate-900">Rs. {(Number(item.sale_price) * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /><p className="font-bold text-slate-500">Decrypting Invoice...</p></div>
          )}

          <div className="border-t border-slate-200 p-6 space-y-4 bg-white">
            <div className="flex justify-between items-center bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 shadow-inner">
              <span className="text-sm font-extrabold text-emerald-800 uppercase tracking-widest">Grand Total</span>
              <span className="text-3xl font-black text-emerald-700">Rs. {Number(selectedSale?.total_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 font-bold h-12 hover:bg-slate-100" onClick={() => setIsModalOpen(false)}>Close</Button>
              <Link href="/sales" className="flex-[2]">
                <Button className="w-full bg-slate-900 hover:bg-black text-white gap-2 font-black h-12 shadow-lg">
                  <ExternalLink className="h-4 w-4" /> Jump to Sales Book
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}