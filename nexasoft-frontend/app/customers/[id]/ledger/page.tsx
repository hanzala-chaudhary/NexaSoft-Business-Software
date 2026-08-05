"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, TrendingUp, TrendingDown, Wallet,
  ChevronDown, ChevronRight, Package, User, Phone, MapPin,
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

export default function CustomerLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [data, setData] = useState<{ customer: any; entries: LedgerEntry[]; totalOutstanding: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const fetchLedger = async () => {
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
    };
    fetchLedger();
  }, [customerId]);

  if (isLoading) {
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
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Baqaya</p>
                <p className={`text-3xl font-black ${totalOutstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  Rs. {totalOutstanding.toLocaleString()}
                </p>
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
    </div>
  );
}