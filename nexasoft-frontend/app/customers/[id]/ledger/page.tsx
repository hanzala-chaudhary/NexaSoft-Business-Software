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
  ChevronDown, ChevronRight, Package, User, Phone, MapPin, X, Banknote,
  Printer, MessageCircle, FileSpreadsheet, Calendar, AlertCircle, CheckCircle2,
  Search, Mail
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

interface LedgerItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface LedgerEntry {
  date: string;
  type: "SALE" | "PAYMENT";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  items?: LedgerItem[];
  paymentMethod?: string;
}

const PAYMENT_METHODS = ["CASH", "JAZZCASH", "EASYPAISA", "BANK_TRANSFER", "CARD", "CHEQUE"];

export default function CustomerLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [data, setData] = useState<{ customer: any; entries: LedgerEntry[]; totalOutstanding: number } | null>(null);
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

  // ─── Receive Payment modal state ───────────────────────────────────────────
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ appliedToSalesCount: number; advanceAmount: number } | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!customerId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/customers/${customerId}/ledger`);
      if (!res.ok) throw new Error("Cloud ledger sync failed. Khata load nahi ho saka.");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && !showPaymentModal && data) {
        e.preventDefault();
        openPaymentModal();
      }
      if (e.key === "p" && e.ctrlKey && data) {
        e.preventDefault();
        handlePrintLedger();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const openPaymentModal = () => {
    setPaymentAmount(data?.totalOutstanding && data.totalOutstanding > 0 ? String(data.totalOutstanding) : "");
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setNotes("");
    setPaymentError("");
    setSuccessInfo(null);
    setShowPaymentModal(true);
  };

  const handleReceivePayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Invalid amount. Value must be strictly greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setPaymentError("");

    try {
      const res = await fetch(`${API_URL}/customers/${customerId}/receive-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: paymentMethod,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Payment transaction blocked by cloud.");

      setSuccessInfo({
        appliedToSalesCount: result.appliedToSalesCount ?? 0,
        advanceAmount: result.advanceAmount ?? 0,
      });

      showToast("Payment logged successfully!", "success");
      await fetchLedger();

      setTimeout(() => {
        setShowPaymentModal(false);
        setSuccessInfo(null);
      }, 2500);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsAppStatement = () => {
    if (!data?.customer?.phone) {
      showToast("Customer ka phone number saved nahi hai.", "error");
      return;
    }
    const phone = data.customer.phone.replace(/[^0-9]/g, '');
    const out = data.totalOutstanding;
    
    let msg = `As Salam o Alaikum *${data.customer.name}*,\n\n`;
    if (out > 0) {
      msg += `Aapka total baqaya (Outstanding Balance) *Rs. ${out.toLocaleString()}* hai. Baraye meherbani jald az jald clear karein.\n\nShukriya!`;
    } else if (out < 0) {
      msg += `Aapka hamare paas Advance Credit *Rs. ${Math.abs(out).toLocaleString()}* jama hai.\n\nShukriya!`;
    } else {
      msg += `Aapka khata bilkul clear (Rs. 0) hai.\n\nShukriya!`;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrintLedger = () => {
    if (!data) return;
    
    let tableRows = '';
    data.entries.forEach(e => {
      const isSale = e.type === "SALE";
      tableRows += `
        <tr>
          <td>${new Date(e.date).toLocaleDateString("en-GB")}</td>
          <td>${isSale ? 'Sale Invoice' : 'Payment Recv.'} <br/><small style="color:#666">${e.reference}</small></td>
          <td style="text-align:right">${isSale ? e.debit.toLocaleString() : '-'}</td>
          <td style="text-align:right">${!isSale ? e.credit.toLocaleString() : '-'}</td>
          <td style="text-align:right; font-weight:bold">${e.balance.toLocaleString()}</td>
        </tr>
      `;
    });

    const printHtml = `
      <html>
        <head>
          <title>Ledger Statement - ${data.customer.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1e40af; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
            .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .info-box h3 { margin: 0 0 5px; font-size: 12px; text-transform: uppercase; color: #64748b; }
            .info-box p { margin: 0; font-size: 16px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th { background: #1e40af; color: white; text-align: left; padding: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
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
            <h1>Statement of Account</h1>
            <p>Generated on: ${new Date().toLocaleString("en-GB")}</p>
          </div>
          
          <div class="info-section">
            <div class="info-box">
              <h3>Client Information</h3>
              <p>${data.customer.name}</p>
              ${data.customer.phone ? `<p style="font-size:13px; font-weight:normal; margin-top:4px;">Ph: ${data.customer.phone}</p>` : ''}
              ${data.customer.address ? `<p style="font-size:13px; font-weight:normal; margin-top:2px;">${data.customer.address}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th style="text-align:right">Debit (Rs)</th>
                <th style="text-align:right">Credit (Rs)</th>
                <th style="text-align:right">Balance (Rs)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-box">
              <h3>Closing Balance</h3>
              <p>Rs. ${Math.abs(data.totalOutstanding).toLocaleString()} ${data.totalOutstanding < 0 ? '(Cr)' : '(Dr)'}</p>
            </div>
          </div>

          <div class="footer">
            System Generated Ledger Document.<br/>
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
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-bold animate-pulse">Syncing Cloud Ledger...</p>
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
          <Button onClick={() => router.push("/customers")} className="bg-rose-600 hover:bg-rose-700">Go Back to Customers</Button>
        </div>
      </div>
    );
  }

  const { customer, entries, totalOutstanding } = data;

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
          onClick={() => router.push("/customers")}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Database
        </button>

        {/* Customer Summary Card VIP */}
        <Card className="shadow-lg border-slate-200 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><User className="h-40 w-40"/></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center border-2 border-indigo-200 shadow-sm shrink-0">
                  <span className="text-3xl font-black text-indigo-700">{customer.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{customer.name}</h1>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-sm font-semibold text-slate-600">
                    {customer.phone && (
                      <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-indigo-500" /> {customer.phone}</span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-indigo-500" /> {customer.email}</span>
                    )}
                    {customer.address && (
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-indigo-500" /> {customer.address}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-100 w-full md:w-auto">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ledger Closing Balance</p>
                  <p className={`text-4xl font-black tracking-tight ${totalOutstanding > 0 ? "text-rose-600" : totalOutstanding < 0 ? "text-blue-600" : "text-emerald-600"}`}>
                    Rs. {Math.abs(totalOutstanding).toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-bold uppercase mt-1 ${totalOutstanding > 0 ? "text-rose-500" : totalOutstanding < 0 ? "text-blue-500" : "text-emerald-500"}`}>
                    {totalOutstanding > 0 ? "Net Payable (Udhaar)" : totalOutstanding < 0 ? "Advance Credit" : "Cleared"}
                  </p>
                </div>
              </div>

            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-100">
              <Button onClick={openPaymentModal} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold shadow-md hover:shadow-lg transition-all h-11 px-6">
                <Banknote className="h-5 w-5" /> Receive Payment <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded opacity-80 ml-1">[F2]</span>
              </Button>
              
              <Button variant="outline" onClick={handlePrintLedger} className="border-slate-300 font-bold hover:bg-slate-50 h-11 px-4 gap-2 text-slate-700">
                <Printer className="h-4 w-4 text-indigo-600" /> Statement
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
              <Calendar className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800">Transaction History</h2>
              <Badge className="ml-2 bg-indigo-100 text-indigo-800 font-bold shadow-sm hover:bg-indigo-100">{filteredEntries.length} Records</Badge>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search invoice or item..." 
                className="pl-9 h-10 bg-white border-slate-200 shadow-inner font-semibold text-sm focus-visible:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
               <FileSpreadsheet className="h-12 w-12 text-slate-300" />
               <p className="text-slate-500 font-bold text-lg">No transactions found.</p>
               <p className="text-slate-400 text-sm">Ledger is completely empty or search yielded no results.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry, index) => {
                const isSale = entry.type === "SALE";
                const isExpanded = expandedIndex === index;

                return (
                  <div key={index} className="group">
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 ${isSale ? "cursor-pointer hover:bg-indigo-50/30" : "bg-emerald-50/20"} transition-all`}
                      onClick={() => {
                        if (isSale) setExpandedIndex(isExpanded ? null : index);
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {isSale ? (
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
                                <TrendingUp className="h-5 w-5" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-indigo-600" /> : <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />}
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
                            {isSale ? "Sale Invoice" : "Payment Received"}
                            {!isSale && entry.paymentMethod && (
                              <Badge variant="outline" className="text-[9px] h-5 bg-white font-bold">{entry.paymentMethod}</Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{entry.reference}</span>
                            <span className="text-xs font-semibold text-slate-400">· {new Date(entry.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left sm:text-right mt-4 sm:mt-0 ml-14 sm:ml-0">
                        <p className={`font-black text-xl tracking-tight ${isSale ? "text-rose-600" : "text-emerald-600"}`}>
                          {isSale ? "+" : "-"} Rs. {(isSale ? entry.debit : entry.credit).toLocaleString()}
                        </p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                          Run. Bal: <span className="text-slate-800">Rs. {entry.balance.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Expandable Receipt Details */}
                    {isSale && isExpanded && (
                      <div className="bg-slate-800 text-white px-6 py-5 shadow-inner animate-in slide-in-from-top-2">
                        {(!entry.items || entry.items.length === 0) ? (
                          <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                            <AlertCircle className="h-4 w-4" /> Legacy invoice. Itemized data unavailable.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs font-extrabold text-indigo-300 uppercase tracking-widest flex items-center gap-2 border-b border-slate-700 pb-2">
                              <Package className="h-4 w-4" /> Itemized Bill Details
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {entry.items.map((item, i) => (
                                <div key={i} className="bg-slate-900 rounded-lg border border-slate-700 p-3 flex flex-col justify-between">
                                  <p className="font-bold text-slate-200 text-sm line-clamp-2 leading-snug">{item.name}</p>
                                  <div className="flex justify-between items-end mt-3">
                                    <Badge className="bg-slate-700 text-slate-300 hover:bg-slate-700 border-none rounded">
                                      {item.quantity} x Rs. {item.unitPrice.toLocaleString()}
                                    </Badge>
                                    <p className="font-black text-emerald-400">Rs. {item.total.toLocaleString()}</p>
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

      {/* ─── Receive Payment VIP Modal ─────────────────────────────────────────── */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => !isSubmitting && setShowPaymentModal(false)}
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
                <h3 className="text-2xl font-black uppercase tracking-widest">Payment Secured</h3>
                <div className="bg-black/20 p-4 rounded-xl inline-block text-left space-y-1">
                  {successInfo.appliedToSalesCount > 0 && (
                    <p className="font-bold text-emerald-50">✔ {successInfo.appliedToSalesCount} pending invoice(s) cleared.</p>
                  )}
                  {successInfo.advanceAmount > 0 && (
                    <p className="font-bold text-emerald-100">✔ Rs. {successInfo.advanceAmount.toLocaleString()} converted to Advance Credit.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-indigo-600 px-6 py-5 text-white">
                  <div>
                    <h3 className="text-xl font-extrabold flex items-center gap-2">
                      <Banknote className="h-6 w-6" /> Log Customer Payment
                    </h3>
                    <p className="text-xs font-medium text-indigo-200 mt-1">Settle outstanding dues or accept advance deposits.</p>
                  </div>
                  <button onClick={() => !isSubmitting && setShowPaymentModal(false)} className="text-indigo-200 hover:text-white bg-indigo-700/50 hover:bg-indigo-700 p-2 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-inner">
                    <span className="font-bold text-slate-500 uppercase text-xs tracking-wider">Current Outstanding</span>
                    <span className={`text-2xl font-black ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Rs. {totalOutstanding.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Received Amount (Rs.) <span className="text-rose-500">*</span></Label>
                    <Input
                      type="number" min="1"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 25000"
                      className="h-14 text-2xl font-black text-indigo-700 border-slate-300 focus-visible:ring-indigo-500 shadow-sm"
                      autoFocus
                    />
                    
                    {/* DYNAMIC ADVANCE CALCULATOR */}
                    {Number(paymentAmount) > totalOutstanding && totalOutstanding > 0 && (
                      <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded flex items-center gap-1.5 mt-2 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4" /> 
                        Rs. {(Number(paymentAmount) - totalOutstanding).toLocaleString()} will be saved as Advance Credit.
                      </p>
                    )}
                    {Number(paymentAmount) > 0 && totalOutstanding <= 0 && (
                      <p className="text-xs font-bold text-blue-600 bg-blue-50 p-2 rounded flex items-center gap-1.5 mt-2 animate-in fade-in">
                        <Wallet className="h-4 w-4" /> 
                        Entire Rs. {Number(paymentAmount).toLocaleString()} goes to Advance Credit.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Mode</Label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-11 rounded-lg border border-slate-300 px-3 font-bold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
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
                        className="h-11 border-slate-300 font-bold focus-visible:ring-indigo-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between">Remarks <span className="text-slate-400 font-normal lowercase">(Opt)</span></Label>
                    <Input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Cleared pending dues via cash"
                      className="h-11 border-slate-300 font-medium focus-visible:ring-indigo-500 shadow-sm"
                    />
                  </div>

                  {paymentError && (
                    <div className="flex items-center gap-2 p-3 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 shrink-0" /> {paymentError}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <Button variant="outline" className="flex-1 font-bold h-12" onClick={() => !isSubmitting && setShowPaymentModal(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button
                    onClick={handleReceivePayment}
                    disabled={isSubmitting}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black h-12 shadow-lg hover:shadow-xl transition-all gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Banknote className="h-5 w-5" />} 
                    {isSubmitting ? "Processing..." : "COMMIT PAYMENT"}
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