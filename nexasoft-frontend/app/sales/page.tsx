"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, FileText, Printer, Loader2, ExternalLink, Calendar, User, 
  Undo2, ArrowLeft, CheckCircle2, AlertCircle, X, Download, Filter, 
  Banknote, ShoppingBag, RotateCcw
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

const SHOP = {
  name: "Tayyab & Hassan Traders",
  tagline: "Importer & Distributor of Computer Parts",
  addressLine1: "Shop # 2, Dawood Plaza,",
  addressLine2: "Near China Center, Hall Road, Lahore",
  phones: "0323-4072182 | 0328-1828034",
};

const SOFTWARE = { name: "NexaSoft Business Software", phone: "0370-5407699" };

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  
  // Cloud Notifications
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>({ show: false, msg: "", type: "success" });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Return/Refund State
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [returnSelection, setReturnSelection] = useState<Record<string, { quantity: number; serials: string[] }>>({});

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
  };

  useEffect(() => {
    fetchSales();
    
    // Shortcut for search
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.getElementById("search-invoices")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/sales`);
      if (!res.ok) throw new Error("Cloud sync failed for sales history.");
      const data = await res.json();
      setSales(data);
    } catch (error: any) {
      console.error("Fetch Error:", error);
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- ADVANCED FILTERS ---
  const filteredSales = sales.filter((sale) => {
    // 1. Text Search
    const query = searchQuery.toLowerCase();
    const invoiceMatch = sale.invoice_number?.toLowerCase().includes(query);
    const customerMatch = sale.customer?.name?.toLowerCase().includes(query) || (query === "walk-in" && !sale.customer);
    if (query && !invoiceMatch && !customerMatch) return false;

    // 2. Status Filter
    if (statusFilter !== "ALL" && sale.payment_status !== statusFilter) return false;

    // 3. Date Filter
    if (dateFilter !== "ALL") {
      const saleDate = new Date(sale.created_at);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      if (dateFilter === "TODAY") {
        if (saleDate < today) return false;
      } else if (dateFilter === "7DAYS") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        if (saleDate < sevenDaysAgo) return false;
      } else if (dateFilter === "THIS_MONTH") {
        if (saleDate.getMonth() !== today.getMonth() || saleDate.getFullYear() !== today.getFullYear()) return false;
      }
    }

    return true;
  });

  // --- KPI CALCULATIONS ---
  const totalFilteredRevenue = filteredSales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  const totalFilteredRefunds = filteredSales.reduce((acc, curr) => curr.payment_status === 'REFUNDED' ? acc + Number(curr.total_amount || 0) : acc, 0);

  const handleViewInvoice = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/sales/${id}`);
      if (!res.ok) throw new Error("Invoice decrypt failed.");
      const data = await res.json();
      setSelectedSale(data);
      setIsReturnMode(false);
      setIsModalOpen(true);
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  // --- RETURN LOGIC ---
  const startReturnMode = () => {
    const initialSelection: Record<string, { quantity: number; serials: string[] }> = {};
    selectedSale.items.forEach((item: any) => {
      initialSelection[item.product_id] = { quantity: 0, serials: [] };
    });
    setReturnSelection(initialSelection);
    setIsReturnMode(true);
  };

  const toggleReturnSerial = (productId: string, serial: string) => {
    setReturnSelection((prev) => {
      const current = prev[productId];
      const isSelected = current.serials.includes(serial);
      const newSerials = isSelected 
        ? current.serials.filter(s => s !== serial) 
        : [...current.serials, serial];
        
      return {
        ...prev,
        [productId]: { quantity: newSerials.length, serials: newSerials }
      };
    });
  };

  const handleReturnQtyChange = (productId: string, qty: number, maxQty: number) => {
    if (qty < 0 || qty > maxQty) return;
    setReturnSelection((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: qty }
    }));
  };

  const submitReturn = async () => {
    const itemsToReturn = Object.entries(returnSelection)
      .filter(([_, data]) => data.quantity > 0)
      .map(([productId, data]) => ({
        productId,
        quantity: data.quantity,
        serialNumbers: data.serials
      }));

    if (itemsToReturn.length === 0) {
      showToast("Return process aborted. No items selected.", "error");
      return;
    }

    try {
      setIsReturning(true);
      const res = await fetch(`${API_URL}/sales/${selectedSale.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsToReturn })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Cloud return protocol failed");

      showToast(`Refund processed successfully! Rs. ${result.refundAmount.toLocaleString()} settled.`, "success");
      setIsModalOpen(false);
      fetchSales(); 
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsReturning(false);
    }
  };

  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      showToast("No data to export.", "error");
      return;
    }
    
    const headers = ["Date", "Invoice No", "Customer", "Total Items", "Total Amount (Rs)", "Status"];
    const csvRows = [headers.join(",")];
    
    filteredSales.forEach(s => {
      const date = new Date(s.created_at).toLocaleString();
      const customer = s.customer?.name || "Walk-in";
      const row = [
        `"${date}"`,
        `"${s.invoice_number}"`,
        `"${customer}"`,
        s.items?.length || 0,
        s.total_amount || 0,
        s.payment_status || "UNKNOWN"
      ];
      csvRows.push(row.join(","));
    });
    
    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Sales_History_Export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("Sales ledger exported successfully!", "success");
  };

  const handleReprint = () => {
    if (!selectedSale) return;

    const itemsHtml = (selectedSale.items || [])
      .map((item: any) => {
        const lineTotal = (item.sale_price * item.quantity).toLocaleString();
        const serials = selectedSale.serialized_products
          ?.filter((sp: any) => sp.product_id === item.product_id)
          .map((sp: any) => sp.serial_number);
          
        const serialsHtml = serials?.length > 0 
          ? `<div class="sn">S/N: ${serials.join(", ")}</div>` : "";

        return `
          <div class="item-name">${item.product?.name || 'Unknown Product'}</div>
          <div class="row">
            <span class="qty">${item.quantity} x Rs. ${Number(item.sale_price).toLocaleString()}</span>
            <span class="amount">Rs. ${lineTotal}</span>
          </div>
          ${serialsHtml}
        `;
      })
      .join("");

    const customerName = selectedSale.customer?.name || "Walk-in Customer";
    const customerPhone = selectedSale.customer?.phone || "";

    const customerHtml = customerName !== "Walk-in Customer" 
      ? `<div class="divider"></div>
         <div class="row"><span>Customer:</span><span style="font-weight:bold;">${customerName}</span></div>
         ${customerPhone ? `<div class="row"><span>Phone:</span><span>${customerPhone}</span></div>` : ""}`
      : `<div class="divider"></div><div class="row"><span>Customer:</span><span>Walk-in Customer</span></div>`;

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt ${selectedSale.invoice_number}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 10px 12px 16px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; width: 80mm; }
            .center { text-align: center; }
            .shop-name { font-size: 16px; font-weight: 700; letter-spacing: .3px; }
            .tagline { font-size: 9.5px; margin-top: 2px; }
            .addr { font-size: 10px; margin-top: 3px; line-height: 1.4; }
            .divider { border-top: 1px dashed #000; margin: 7px 0; }
            .divider-solid { border-top: 1.5px solid #000; margin: 7px 0; }
            .row { display: flex; justify-content: space-between; align-items: baseline; }
            .meta .row { font-size: 10.5px; margin: 2px 0; }
            .col-head { display: flex; justify-content: space-between; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .3px; }
            .item-name { font-weight: 700; font-size: 11.5px; margin-top: 6px; }
            .qty { font-size: 10.5px; color: #222; }
            .amount { font-size: 10.5px; font-weight: 700; }
            .sn { font-size: 9px; color: #333; margin: 1px 0 2px; }
            .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; margin-top: 4px; }
            .thankyou { text-align: center; font-size: 10.5px; margin-top: 12px; font-weight: 600; }
            .footer-box { border: 1px solid #000; border-radius: 4px; padding: 5px 8px; margin-top: 8px; text-align: center; font-size: 9px; line-height: 1.6; }
            .footer-brand { font-size: 10.5px; font-weight: 800; margin: 1px 0; }
            .reprint-badge { text-align: center; font-size: 10px; font-weight: bold; padding: 2px; border: 1px dashed #000; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="reprint-badge">*** DUPLICATE RECEIPT ***</div>
          <div class="center">
            <div class="shop-name">${SHOP.name}</div>
            <div class="tagline">${SHOP.tagline}</div>
            <div class="addr">${SHOP.addressLine1}<br/>${SHOP.addressLine2}</div>
            <div class="addr">Ph: ${SHOP.phones}</div>
          </div>
          <div class="divider-solid"></div>
          <div class="meta">
            <div class="row"><span>Invoice #</span><span>${selectedSale.invoice_number}</span></div>
            <div class="row"><span>Date</span><span>${new Date(selectedSale.created_at).toLocaleString()}</span></div>
          </div>
          ${customerHtml}
          <div class="divider"></div>
          <div class="col-head"><span>Item</span><span>Amount</span></div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider-solid"></div>
          <div class="total-row"><span>TOTAL</span><span>Rs. ${Number(selectedSale.total_amount).toLocaleString()}</span></div>
          <div class="divider"></div>
          <div class="thankyou">Thank you for your business!</div>
          <div class="footer-box">
            <div>Powered by</div>
            <div class="footer-brand">${SOFTWARE.name}</div>
            <div>${SOFTWARE.phone}</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      showToast("Popup blocked. Please allow popups to print receipt.", "error");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold shadow-sm">PAID</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-bold shadow-sm">PARTIAL</Badge>;
      case 'UNPAID':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none font-bold shadow-sm">UNPAID</Badge>;
      case 'REFUNDED':
        return <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none font-bold shadow-sm">REFUNDED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-600" />
            Sales Ledger & Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Track your previous sales, manage refunds, and reprint receipts instantly.</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="font-bold border-slate-300 shadow-sm h-11 px-4 gap-2">
          <Download className="h-4 w-4 text-emerald-600" /> Export CSV
        </Button>
      </div>

      {/* KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Filtered Revenue</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">Rs. {totalFilteredRevenue.toLocaleString()}</h3>
            </div>
            <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <Banknote className="h-7 w-7 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Invoices Found</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{filteredSales.length}</h3>
            </div>
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <ShoppingBag className="h-7 w-7 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Total Refunded</p>
              <h3 className="text-3xl font-black text-rose-600 mt-1">Rs. {totalFilteredRefunds.toLocaleString()}</h3>
            </div>
            <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
              <RotateCcw className="h-7 w-7 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* INVOICES TABLE & FILTERS */}
      <Card className="shadow-lg border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                id="search-invoices"
                placeholder="Search Invoice # or Customer... (Press '/')"
                className="pl-11 h-12 bg-white border-slate-300 shadow-inner font-semibold focus-visible:ring-indigo-500 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg h-12 px-3 shadow-sm">
                <Filter className="h-4 w-4 text-slate-400" />
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="PAID">Paid Only</option>
                  <option value="PARTIAL">Partial Only</option>
                  <option value="UNPAID">Unpaid (Udhaar)</option>
                  <option value="REFUNDED">Refunded</option>
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
                  <option value="7DAYS">Last 7 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                </select>
              </div>
            </div>

          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="font-bold text-slate-700 w-[180px]">Date & Time</TableHead>
                <TableHead className="font-bold text-slate-700">Invoice Ref</TableHead>
                <TableHead className="font-bold text-slate-700">Client Info</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Items</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Total Bill</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" /><p className="mt-2 font-medium text-slate-500">Decrypting Invoices...</p></TableCell></TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center flex-col items-center justify-center text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-bold">No invoices match your criteria.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-indigo-50/40 transition-colors group">
                    <TableCell className="text-slate-600">
                      <div className="font-bold">{new Date(sale.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-xs text-slate-400 font-semibold">{new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono font-bold text-indigo-700 bg-indigo-50 border-indigo-200 px-2 py-1 shadow-sm">
                        {sale.invoice_number}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.customer ? (
                        <div className="font-extrabold text-slate-800">{sale.customer.name}</div>
                      ) : (
                        <div className="text-slate-400 font-semibold italic">Walk-in Customer</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono font-bold">{sale.items?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 text-lg tracking-tight">
                      Rs. {Number(sale.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(sale.payment_status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 font-bold" onClick={() => handleViewInvoice(sale.id)}>
                        <ExternalLink className="h-4 w-4 mr-2" /> OPEN
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── INVOICE DETAILS & RETURN MODAL ─── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-50">
          
          <div className={`px-6 py-4 flex justify-between items-center text-white ${isReturnMode ? 'bg-rose-600' : 'bg-indigo-600'}`}>
            <DialogTitle className="text-xl font-black flex items-center gap-3">
              {isReturnMode ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-rose-700 rounded-full" onClick={() => setIsReturnMode(false)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              ) : (
                <FileText className="h-6 w-6" />
              )}
              <span>{isReturnMode ? "Process Return & Refund" : "Invoice Dashboard"}</span>
            </DialogTitle>
            <Badge variant="outline" className={`font-mono text-sm border-white/30 text-white shadow-sm ${isReturnMode ? 'bg-rose-800' : 'bg-indigo-800'}`}>{selectedSale?.invoice_number}</Badge>
          </div>

          {selectedSale ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {!isReturnMode && (
                <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5"><User className="h-24 w-24"/></div>
                  <div className="space-y-1 relative z-10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">Client Profile</p>
                    <p className="font-extrabold text-slate-800 text-lg">{selectedSale.customer?.name || "Walk-in Counter"}</p>
                    {selectedSale.customer?.phone && <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mt-1">{selectedSale.customer.phone}</p>}
                  </div>
                  <div className="space-y-1 text-right relative z-10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">Timestamp</p>
                    <p className="font-bold text-slate-800">{new Date(selectedSale.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
                    <p className="text-sm font-semibold text-slate-500">{new Date(selectedSale.created_at).toLocaleTimeString('en-US', { timeStyle: 'short' })}</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider bg-slate-100 px-5 py-3 border-b border-slate-200">
                  {isReturnMode ? "Select Products to Refund" : "Order Breakdown"}
                </h3>
                <div className="space-y-0 divide-y divide-slate-100">
                  {selectedSale.items?.map((item: any, idx: number) => {
                    const serials = selectedSale.serialized_products
                      ?.filter((sp: any) => sp.product_id === item.product_id)
                      .map((sp: any) => sp.serial_number);
                    
                    const isSerialized = serials?.length > 0;
                    const returnData = returnSelection[item.product_id];
                    const isReturningItem = isReturnMode && returnData?.quantity > 0;

                    return (
                      <div key={idx} className={`p-5 transition-colors ${isReturningItem ? 'bg-rose-50/50' : 'hover:bg-slate-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-extrabold text-slate-900 text-base">{item.product?.name || "Unknown Product"}</p>
                            <p className="text-sm text-indigo-600 font-bold mt-1">
                              Rs. {Number(item.sale_price).toLocaleString()} <span className="text-slate-400 font-semibold ml-1">x {item.quantity} units</span>
                            </p>
                          </div>
                          {!isReturnMode && (
                            <p className="font-black text-slate-900 text-lg">Rs. {(Number(item.sale_price) * item.quantity).toLocaleString()}</p>
                          )}
                        </div>
                        
                        {/* Normal View: Show Serials */}
                        {!isReturnMode && isSerialized && (
                          <div className="bg-slate-100 p-2.5 rounded-lg text-xs border border-slate-200 mt-3 flex items-start gap-2">
                            <span className="font-bold text-slate-500 uppercase tracking-wider mt-0.5 shrink-0">S/N:</span>
                            <span className="font-mono font-semibold text-slate-700 break-words">{serials.join(", ")}</span>
                          </div>
                        )}

                        {/* Return Mode View: Selection Controls */}
                        {isReturnMode && (
                          <div className="pt-4 mt-3 border-t border-slate-100">
                            {isSerialized ? (
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Serial Numbers to Return:</p>
                                <div className="flex flex-wrap gap-2">
                                  {serials.map((sn: string) => {
                                    const isSelected = returnData?.serials.includes(sn);
                                    return (
                                      <button
                                        key={sn}
                                        onClick={() => toggleReturnSerial(item.product_id, sn)}
                                        className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all border-2 ${
                                          isSelected 
                                            ? 'bg-rose-100 border-rose-400 text-rose-800 shadow-sm' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                                        }`}
                                      >
                                        {sn}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity to Refund:</p>
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max={item.quantity}
                                    value={returnData?.quantity || 0}
                                    onChange={(e) => handleReturnQtyChange(item.product_id, parseInt(e.target.value) || 0, item.quantity)}
                                    className="w-24 h-10 rounded-md border-2 border-slate-300 px-3 text-lg text-center font-black focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition-all"
                                  />
                                  <span className="text-sm font-bold text-slate-400">/ {item.quantity}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center gap-3"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /><p className="font-bold text-slate-500">Decrypting Secure Invoice...</p></div>
          )}

          {selectedSale && (
            <div className="border-t border-slate-200 p-6 bg-white z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              {!isReturnMode ? (
                <>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                    <span className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">Grand Total</span>
                    <span className="text-3xl font-black text-indigo-700 tracking-tight">Rs. {Number(selectedSale?.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap gap-3">
                    <Button variant="outline" className="w-full sm:flex-1 font-bold h-12 hover:bg-slate-100 text-slate-700 border-2" onClick={() => setIsModalOpen(false)}>Close Window</Button>
                    <Button className="w-full sm:flex-[1.5] bg-indigo-600 hover:bg-indigo-700 gap-2 font-black h-12 shadow-lg hover:shadow-xl transition-all" onClick={handleReprint}>
                      <Printer className="h-5 w-5" /> PRINT THERMAL RECEIPT
                    </Button>
                    {selectedSale?.payment_status !== 'REFUNDED' && (
                      <Button className="w-full sm:flex-1 bg-rose-600 hover:bg-rose-700 gap-2 font-black h-12 shadow-md transition-all text-white border-none" onClick={startReturnMode}>
                        <Undo2 className="h-5 w-5" /> INITIATE REFUND
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center px-5 py-4 bg-rose-50 border-2 border-rose-200 rounded-xl mb-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><RotateCcw className="h-20 w-20 text-rose-500"/></div>
                    <span className="text-sm font-extrabold text-rose-800 uppercase tracking-widest relative z-10">Calculated Refund</span>
                    <span className="text-4xl font-black text-rose-700 tracking-tight relative z-10">
                      Rs. {Object.entries(returnSelection).reduce((sum, [productId, data]) => {
                        const item = selectedSale.items.find((i: any) => i.product_id === productId);
                        return sum + (Number(item?.sale_price || 0) * data.quantity);
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 font-bold h-12 border-2 hover:bg-slate-100" onClick={() => setIsReturnMode(false)} disabled={isReturning}>Cancel</Button>
                    <Button className="flex-[2] bg-rose-600 hover:bg-rose-700 gap-2 font-black h-12 shadow-xl hover:-translate-y-0.5 transition-all text-white" onClick={submitReturn} disabled={isReturning}>
                      {isReturning ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                      {isReturning ? "PROCESSING LEDGER..." : "CONFIRM REFUND TO STOCK"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}