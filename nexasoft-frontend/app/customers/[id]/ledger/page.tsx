"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, TrendingUp, TrendingDown, Wallet,
  ChevronDown, ChevronRight, Package, User, Phone, MapPin, X, Banknote,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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

const PAYMENT_METHODS = ["CASH", "JAZZCASH", "EASYPAISA", "BANK_TRANSFER", "CARD"];

export default function CustomerLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [data, setData] = useState<{ customer: any; entries: LedgerEntry[]; totalOutstanding: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
      if (!res.ok) throw new Error("Ledger load nahi ho saka");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const openPaymentModal = () => {
    setPaymentAmount("");
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
      setPaymentError("Sahi amount likhein — 0 se zyada hona chahiye.");
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
      if (!res.ok) throw new Error(result.message || "Payment record nahi ho saki!");

      setSuccessInfo({
        appliedToSalesCount: result.appliedToSalesCount ?? 0,
        advanceAmount: result.advanceAmount ?? 0,
      });

      // Ledger + Total Baqaya turant refresh — kahin bhi stale data na reh jaye
      await fetchLedger();

      setTimeout(() => {
        setShowPaymentModal(false);
        setSuccessInfo(null);
      }, 1800);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl bg-rose-50 p-6 text-center text-rose-700">{error || "Data nahi mila"}</div>
      </div>
    );
  }

  const { customer, entries, totalOutstanding } = data;

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Wapis — asal Customers list pe le jata hai, browser-back nahi */}
        <button
          onClick={() => router.push("/customers")}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Wapis
        </button>

        {/* Customer Summary Card */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-7 w-7 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    {customer.phone && (
                      <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>
                    )}
                    {customer.address && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {customer.address}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Baqaya</p>
                  <p className={`text-3xl font-black ${totalOutstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    Rs. {totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <Button
                  onClick={openPaymentModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Banknote className="h-4 w-4" /> Payment Wasool Karo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger History — expandable */}
        <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Khata History</h2>
          </div>

          {entries.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Koi transaction abhi tak nahi hui.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry, index) => {
                const isSale = entry.type === "SALE";
                const isExpanded = expandedIndex === index;

                return (
                  <div key={index}>
                    <div
                      className={`flex items-center justify-between px-5 py-4 ${isSale ? "cursor-pointer hover:bg-slate-50" : ""} transition-colors`}
                      onClick={() => {
                        if (isSale) setExpandedIndex(isExpanded ? null : index);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {isSale && (
                          isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center ${
                            isSale ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {isSale ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {isSale ? "Sale Invoice" : `Payment Received${entry.paymentMethod ? ` (${entry.paymentMethod})` : ""}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {entry.reference} · {new Date(entry.date).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isSale ? "text-rose-600" : "text-emerald-600"}`}>
                          {isSale ? "+" : "-"} Rs. {(isSale ? entry.debit : entry.credit).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">Balance: Rs. {entry.balance.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Expanded items list */}
                    {isSale && isExpanded && (
                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                        {(!entry.items || entry.items.length === 0) ? (
                          <p className="text-xs text-slate-400 italic">Item details available nahi hain.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                              <Package className="h-3.5 w-3.5" /> Kya becha gaya
                            </p>
                            {entry.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between bg-white rounded-lg border border-slate-100 px-3 py-2 text-sm">
                                <div>
                                  <p className="font-semibold text-slate-800">{item.name}</p>
                                  <p className="text-xs text-slate-400">{item.quantity} x Rs. {item.unitPrice.toLocaleString()}</p>
                                </div>
                                <p className="font-bold text-slate-800">Rs. {item.total.toLocaleString()}</p>
                              </div>
                            ))}
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

        {totalOutstanding > 0 && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-indigo-600" />
            <p className="text-sm font-semibold text-indigo-700">
              Is customer se Rs. {totalOutstanding.toLocaleString()} wasool karna baqi hai
            </p>
          </div>
        )}
      </div>

      {/* ─── Receive Payment Modal ─────────────────────────────────────────── */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !isSubmitting && setShowPaymentModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-indigo-600" /> Payment Wasool Karo
              </h3>
              <button
                onClick={() => !isSubmitting && setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {successInfo ? (
              <div className="p-8 text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-bold text-slate-900">Payment record ho gayi!</p>
                {successInfo.appliedToSalesCount > 0 && (
                  <p className="text-sm text-slate-500">
                    {successInfo.appliedToSalesCount} invoice{successInfo.appliedToSalesCount > 1 ? "s" : ""} clear ho gaye.
                  </p>
                )}
                {successInfo.advanceAmount > 0 && (
                  <p className="text-sm text-slate-500">
                    Rs. {successInfo.advanceAmount.toLocaleString()} advance credit ban gaya.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-500">
                  Total Baqaya: <span className="font-bold text-rose-600">Rs. {totalOutstanding.toLocaleString()}</span>
                </p>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Amount (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Reference # (optional)</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. cheque/transaction #"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. cash counter se wasool ki"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {paymentError && (
                  <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{paymentError}</p>
                )}

                <Button
                  onClick={handleReceivePayment}
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Payment Record Karo"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}