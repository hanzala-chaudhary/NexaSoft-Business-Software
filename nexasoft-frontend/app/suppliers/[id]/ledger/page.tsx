"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Loader2, TrendingUp, TrendingDown, Wallet,
  ChevronDown, ChevronRight, Package, Building2, Phone, MapPin, X, Banknote,
  Printer, MessageCircle, FileSpreadsheet, Calendar, AlertCircle, CheckCircle2,
  Search, Mail
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

interface LedgerItem {
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
}

interface LedgerEntry {
  date: string;
  type: "PURCHASE" | "PAYMENT";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  items?: LedgerItem[];
  paymentMethod?: string;
}

const PAYMENT_METHODS = ["CASH", "JAZZCASH", "EASYPAISA", "BANK_TRANSFER", "CARD", "CHEQUE"];

export default function SupplierLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params?.id as string;

  const [data, setData] = useState<{ supplier: any; entries: LedgerEntry[]; totalOutstanding: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Search Filter
  const [searchTerm, setSearchTerm] = useState("");

  // ─── Cloud Notifications ───────────────────────────────────────────────────
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>({ show: false, msg: "", type: "success" });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
  };

  // ─── Pay Supplier modal state ──────────────────────────────────────────────
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ appliedToPurchasesCount: number; advanceAmount: number } | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!supplierId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/suppliers/${supplierId}/ledger`);
      if (!res.ok) throw new Error("Cloud ledger sync failed. Vendor khata load nahi ho saka.");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && !showPayModal && data) {
        e.preventDefault();
        openPayModal();
      }
      if (e.key === "p" && e.ctrlKey && data) {
        e.preventDefault();
        handlePrintLedger();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const openPayModal = () => {
    setPayAmount(data?.totalOutstanding && data.totalOutstanding > 0 ? String(data.totalOutstanding) : "");
    setPayMethod("CASH");
    setReferenceNumber("");
    setNotes("");
    setPayError("");
    setSuccessInfo(null);
    setShowPayModal(true);
  };

  const handlePaySupplier = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setPayError("Invalid amount. Value must be strictly greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setPayError("");

    try {
      const res = await fetch(`${API_URL}/suppliers/${supplierId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: payMethod,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Payment transaction blocked by cloud.");

      setSuccessInfo({
        appliedToPurchasesCount: result.appliedToPurchasesCount ?? 0,
        advanceAmount: result.advanceAmount ?? 0,
      });

      showToast("Payment released to vendor successfully!", "success");
      await fetchLedger();

      setTimeout(() => {
        setShowPayModal(false);
        setSuccessInfo(null);
      }, 2500);
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsAppStatement = () => {
    if (!data?.supplier?.phone) {
      showToast("Vendor ka phone number saved nahi hai.", "error");
      return;
    }
    const phone = data.supplier.phone.replace(/[^0-9]/g, '');
    const out = data.totalOutstanding;
    
    let msg = `As Salam o Alaikum *${data.supplier.name}* (${data.supplier.company || "Vendor"}),\n\n`;
    if (out > 0) {
      msg += `Aapka hamari taraf total baqaya (Payable) *Rs. ${out.toLocaleString()}* hai. Jo jald clear kar diya jayega.\n\nShukriya!`;
    } else if (out < 0) {
      msg += `Aapke paas hamara Advance *Rs. ${Math.abs(out).toLocaleString()}* jama hai.\n\nShukriya!`;
    } else {
      msg += `Aapka aur hamara khata bilkul clear (Rs. 0) hai.\n\nShukriya!`;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrintLedger = () => {
    if (!data) return;
    
    let tableRows = '';
    data.entries.forEach(e => {
      const isPurchase = e.type === "PURCHASE";
      tableRows += `
        <tr>
          <td>${new Date(e.date).toLocaleDateString("en-GB")}</td>
          <td>${isPurchase ? 'Purchase Invoice' : 'Payment Given'} <br/><small style="color:#666">${e.reference}</small></td>
          <td style="text-align:right">${isPurchase ? e.debit.toLocaleString() : '-'}</td>
          <td style="text-align:right">${!isPurchase ? e.credit.toLocaleString() : '-'}</td>
          <td style="text-align:right; font-weight:bold">${e.balance.toLocaleString()}</td>
        </tr>
      `;
    });

    const printHtml = `
      <html>
        <head>
          <title>Vendor Statement - ${data.supplier.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #059669; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
            .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; }
            .info-box h3 { margin: 0 0 5px; font-size: 12px; text-transform: uppercase; color: #065f46; }
            .info-box p { margin: 0; font-size: 16px; font-weight: bold; color: #022c22; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th { background: #059669; color: white; text-align: left; padding: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .summary { display: flex; justify-content: flex-end; }
            .summary-box { background: ${data.totalOutstanding > 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${data.totalOutstanding > 0 ? '#fecaca' : '#bbf7d0'}; padding: 20px; border-radius: 8px; text-align: right; min-width: 250px; }
            .summary-box h3 { margin: 0 0 10px; font-size: 14px; color: ${data.totalOutstanding > 0 ? '#991b1b' : '#166534'}; text-transform: uppercase; }
            .summary-box p { margin: 0; font-size: 28px; font-weight: bold; color: ${data.totalOutstanding > 0 ? '#b91c1c' : '#15803d'}; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
            @media print { body { margin: 0; padding: 20px; } .summary-box { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Vendor Statement of Account</h1>
            <p>Generated on: ${new Date().toLocaleString("en-GB")}</p>
          </div>
          
          <div class="info-section">
            <div class="info-box">
              <h3>Vendor Information</h3>
              <p>${data.supplier.name}</p>
              ${data.supplier.company ? `<p style="font-size:13px; font-weight:bold; margin-top:4px; color:#059669;">${data.supplier.company}</p>` : ''}
              ${data.supplier.phone ? `<p style="font-size:13px; font-weight:normal; margin-top:4px;">Ph: ${data.supplier.phone}</p>` : ''}
              ${data.supplier.address ? `<p style="font-size:13px; font-weight:normal; margin-top:2px;">${data.supplier.address}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th style="text-align:right">Bill Amount (Rs)</th>
                <th style="text-align:right">Paid (Rs)</th>
                <th style="text-align:right">Balance (Rs)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-box">
              <h3>Closing Payable</h3>
              <p>Rs. ${Math.abs(data.totalOutstanding).toLocaleString()} ${data.totalOutstanding < 0 ? '(Adv)' : '(Due)'}</p>
            </div>
          </div>

          <div class="footer">
            System Generated Vendor Ledger.<br/>
            Powered by NexaSoft Business Systems
          </div>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      setTimeout(() => { printWin.print(); printWin.close(); }, 500);
    } else {
      showToast("Please allow popups to print ledger.", "error");
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50 flex-col gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-slate-500 font-bold animate-pulse">Syncing Vendor Khata...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-8 text-center max-w-md shadow-sm">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-800 mb-2">Ledger Unavailable</h2>
          <p className="text-rose-600 text-sm mb-6">{error || "Data load failed."}</p>
          <Button onClick={() => router.push("/suppliers")} className="bg-rose-600 hover:bg-rose-700">Go Back to Suppliers</Button>
        </div>
      </div>
    );
  }

  const { supplier, entries, totalOutstanding } = data;

  // Filter entries based on search
  const filteredEntries = entries.filter(e => 
    e.reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.items && e.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 lg:p-8 relative">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <div className={`fixed top-6 right-6 z-[200] transition-all duration-300 transform ${toast.show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border-l-4 ${toast.type === 'error' ? 'bg-rose-900 border-rose-500 text-white' : 'bg-emerald-900 border-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <p className="font-semibold text-sm">{toast.msg}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Wapis Button */}
        <button
          onClick={() => router.push("/suppliers")}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Vendors
        </button>

        {/* Supplier Summary Card VIP */}
        <Card className="shadow-lg border-slate-200 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Building2 className="h-40 w-40"/></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center border-2 border-emerald-200 shadow-sm shrink-0">
                  <span className="text-3xl font-black text-emerald-700">{supplier.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{supplier.name}</h1>
                  {supplier.company && (
                    <Badge variant="outline" className="mt-1 bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">{supplier.company}</Badge>
                  )}
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm font-semibold text-slate-600">
                    {supplier.phone && (
                      <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-emerald-500" /> {supplier.phone}</span>
                    )}
                    {supplier.email && (
                      <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-emerald-500" /> {supplier.email}</span>
                    )}
                    {supplier.address && (
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-emerald-500" /> {supplier.address}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-100 w-full md:w-auto">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Humein Dena Hai</p>
                  <p className={`text-4xl font-black tracking-tight ${totalOutstanding > 0 ? "text-rose-600" : totalOutstanding < 0 ? "text-blue-600" : "text-emerald-600"}`}>
                    Rs. {Math.abs(totalOutstanding).toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-bold uppercase mt-1 ${totalOutstanding > 0 ? "text-rose-500" : totalOutstanding < 0 ? "text-blue-500" : "text-emerald-500"}`}>
                    {totalOutstanding > 0 ? "Payable Debt" : totalOutstanding < 0 ? "Advance Given" : "Cleared"}
                  </p>
                </div>
              </div>

            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-100">
              <Button onClick={openPayModal} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold shadow-md hover:shadow-lg transition-all h-11 px-6">
                <Banknote className="h-5 w-5" /> Give Payment <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded opacity-80 ml-1">[F2]</span>
              </Button>
              
              <Button variant="outline" onClick={handlePrintLedger} className="border-slate-300 font-bold hover:bg-slate-50 h-11 px-4 gap-2 text-slate-700">
                <Printer className="h-4 w-4 text-emerald-600" /> Statement
              </Button>

              <Button variant="outline" onClick={sendWhatsAppStatement} className="border-slate-300 font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 h-11 px-4 gap-2 text-slate-700">
                <MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ledger History — Advanced Interactive View */}
        <Card className="shadow-lg border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-800">Transaction History</h2>
              <Badge className="ml-2 bg-emerald-100 text-emerald-800 font-bold shadow-sm hover:bg-emerald-100">{filteredEntries.length} Records</Badge>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search purchase or item..." 
                className="pl-9 h-10 bg-white border-slate-200 shadow-inner font-semibold text-sm focus-visible:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
               <FileSpreadsheet className="h-12 w-12 text-slate-300" />
               <p className="text-slate-500 font-bold text-lg">No transactions found.</p>
               <p className="text-slate-400 text-sm">Vendor ledger is completely empty or search yielded no results.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry, index) => {
                const isPurchase = entry.type === "PURCHASE";
                const isExpanded = expandedIndex === index;

                return (
                  <div key={index} className="group">
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 ${isPurchase ? "cursor-pointer hover:bg-rose-50/30" : "bg-emerald-50/20"} transition-all`}
                      onClick={() => {
                        if (isPurchase) setExpandedIndex(isExpanded ? null : index);
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {isPurchase ? (
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
                                <TrendingUp className="h-5 w-5" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-rose-600" /> : <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />}
                              </div>
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm">
                              <TrendingDown className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <p className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                            {isPurchase ? "Purchase Invoice (Stock In)" : "Payment Released"}
                            {!isPurchase && entry.paymentMethod && (
                              <Badge variant="outline" className="text-[9px] h-5 bg-white font-bold">{entry.paymentMethod}</Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{entry.reference}</span>
                            <span className="text-xs font-semibold text-slate-400">· {new Date(entry.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left sm:text-right mt-4 sm:mt-0 ml-14 sm:ml-0">
                        <p className={`font-black text-xl tracking-tight ${isPurchase ? "text-rose-600" : "text-emerald-600"}`}>
                          {isPurchase ? "+" : "-"} Rs. {(isPurchase ? entry.debit : entry.credit).toLocaleString()}
                        </p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                          Run. Bal: <span className="text-slate-800">Rs. {entry.balance.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Expandable Purchase Details */}
                    {isPurchase && isExpanded && (
                      <div className="bg-slate-800 text-white px-6 py-5 shadow-inner animate-in slide-in-from-top-2">
                        {(!entry.items || entry.items.length === 0) ? (
                          <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                            <AlertCircle className="h-4 w-4" /> Legacy invoice. Itemized data unavailable.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs font-extrabold text-emerald-300 uppercase tracking-widest flex items-center gap-2 border-b border-slate-700 pb-2">
                              <Package className="h-4 w-4" /> Stock Details Received
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {entry.items.map((item, i) => (
                                <div key={i} className="bg-slate-900 rounded-lg border border-slate-700 p-3 flex flex-col justify-between">
                                  <p className="font-bold text-slate-200 text-sm line-clamp-2 leading-snug">{item.name}</p>
                                  <div className="flex justify-between items-end mt-3">
                                    <Badge className="bg-slate-700 text-slate-300 hover:bg-slate-700 border-none rounded">
                                      {item.quantity} x Rs. {item.unitCost.toLocaleString()}
                                    </Badge>
                                    <p className="font-black text-rose-400">Rs. {item.total.toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Pay Supplier VIP Modal ────────────────────────────────────────────── */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => !isSubmitting && setShowPayModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {successInfo ? (
              <div className="bg-emerald-600 p-10 text-center space-y-4 text-white">
                <div className="mx-auto h-20 w-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest">Payment Recorded</h3>
                <div className="bg-black/20 p-4 rounded-xl inline-block text-left space-y-1">
                  {successInfo.appliedToPurchasesCount > 0 && (
                    <p className="font-bold text-emerald-50">✔ {successInfo.appliedToPurchasesCount} pending purchase invoice(s) cleared.</p>
                  )}
                  {successInfo.advanceAmount > 0 && (
                    <p className="font-bold text-emerald-100">✔ Rs. {successInfo.advanceAmount.toLocaleString()} added to Advance to Vendor.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-emerald-600 px-6 py-5 text-white">
                  <div>
                    <h3 className="text-xl font-extrabold flex items-center gap-2">
                      <Banknote className="h-6 w-6" /> Vendor Outgoing Payment
                    </h3>
                    <p className="text-xs font-medium text-emerald-100 mt-1">Clear pending dues or give advance credit to vendor.</p>
                  </div>
                  <button onClick={() => !isSubmitting && setShowPayModal(false)} className="text-emerald-100 hover:text-white bg-emerald-700/50 hover:bg-emerald-700 p-2 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-inner">
                    <span className="font-bold text-slate-500 uppercase text-xs tracking-wider">Humein Dena Hai</span>
                    <span className={`text-2xl font-black ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Rs. {totalOutstanding.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Amount (Rs.) <span className="text-rose-500">*</span></Label>
                    <Input
                      type="number" min="1"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="h-14 text-2xl font-black text-emerald-700 border-slate-300 focus-visible:ring-emerald-500 shadow-sm"
                      autoFocus
                    />
                    
                    {/* DYNAMIC ADVANCE CALCULATOR */}
                    {Number(payAmount) > totalOutstanding && totalOutstanding > 0 && (
                      <p className="text-xs font-bold text-blue-600 bg-blue-50 p-2 rounded flex items-center gap-1.5 mt-2 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4" /> 
                        Rs. {(Number(payAmount) - totalOutstanding).toLocaleString()} will go as Advance to Vendor.
                      </p>
                    )}
                    {Number(payAmount) > 0 && totalOutstanding <= 0 && (
                      <p className="text-xs font-bold text-blue-600 bg-blue-50 p-2 rounded flex items-center gap-1.5 mt-2 animate-in fade-in">
                        <Wallet className="h-4 w-4" /> 
                        Entire Rs. {Number(payAmount).toLocaleString()} is Advance to Vendor.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Mode</Label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="w-full h-11 rounded-lg border border-slate-300 px-3 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">Ref # <span className="text-slate-400 font-normal lowercase">(Opt)</span></Label>
                      <Input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="Cheque / Txn ID"
                        className="h-11 border-slate-300 font-bold focus-visible:ring-emerald-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">Remarks <span className="text-slate-400 font-normal lowercase">(Opt)</span></Label>
                    <Input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Bank se transfer kiya"
                      className="h-11 border-slate-300 font-medium focus-visible:ring-emerald-500 shadow-sm"
                    />
                  </div>

                  {payError && (
                    <div className="flex items-center gap-2 p-3 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 shrink-0" /> {payError}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <Button variant="outline" className="flex-1 font-bold h-12" onClick={() => !isSubmitting && setShowPayModal(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button
                    onClick={handlePaySupplier}
                    disabled={isSubmitting}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 shadow-lg hover:shadow-xl transition-all gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Banknote className="h-5 w-5" />} 
                    {isSubmitting ? "Processing..." : "CONFIRM TRANSFER"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}