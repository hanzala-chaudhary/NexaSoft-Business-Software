"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ShoppingCart, Truck, CheckCircle2, AlertCircle, Calendar, FileText, User } from "lucide-react";

export default function SerialTrackerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [serialData, setSerialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError("");
    setSerialData(null);

    try {
      const res = await fetch(`http://localhost:4000/serial/${searchQuery}`);
      if (!res.ok) {
        throw new Error("Yeh serial number database mein nahi mila!");
      }
      const data = await res.json();
      setSerialData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Serial Number Tracker</h1>
        <p className="text-slate-500">Scan or type a serial number to track its complete lifecycle (Purchase to Sale).</p>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Scan Barcode or Enter Serial Number here..." 
                className="pl-12 h-14 text-lg bg-white border-slate-300 shadow-sm rounded-xl focus-visible:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-lg rounded-xl shadow-sm" disabled={isLoading}>
              {isLoading ? "Searching..." : "Track Item"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── ERROR MESSAGE ─── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* ─── TRACKING RESULTS TIMELINE ─── */}
      {serialData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Item Summary Card */}
          <Card className="md:col-span-1 shadow-sm border-slate-200 h-fit">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg">Item Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Product Name</p>
                  <p className="text-lg font-bold text-slate-900">{serialData.products?.name}</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Serial Number</p>
                  <p className="font-mono text-base font-semibold bg-slate-100 px-3 py-1.5 rounded-md w-fit">
                    {serialData.serial_number}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-2">Current Status</p>
                  <Badge 
                    className={`px-3 py-1 text-sm ${
                      serialData.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                      serialData.status === 'SOLD' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {serialData.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card className="md:col-span-2 shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg">Lifecycle Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-12">
                
                {/* STEP 1: PURCHASE (Khareed) */}
                <div className="relative pl-8">
                  <div className="absolute -left-[11px] bg-emerald-500 h-5 w-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center"></div>
                  <div className="flex flex-col gap-1 mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-emerald-600" /> Item Purchased
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> {new Date(serialData.purchase?.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Supplier</p>
                      <p className="font-medium text-slate-900">{serialData.supplier?.name} {serialData.supplier?.company && `(${serialData.supplier.company})`}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Invoice Number</p>
                      <p className="font-medium text-slate-900 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {serialData.purchase?.invoice_number}
                      </p>
                    </div>
                  </div>
                </div>

                {/* STEP 2: SALE (Bikri) */}
                <div className="relative pl-8">
                  <div className={`absolute -left-[11px] h-5 w-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                    serialData.sale ? 'bg-blue-500' : 'bg-slate-300'
                  }`}></div>
                  
                  {serialData.sale ? (
                    // Agar bik chuka hai
                    <>
                      <div className="flex flex-col gap-1 mb-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5 text-blue-600" /> Item Sold
                        </h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="h-4 w-4" /> {new Date(serialData.sale?.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Customer</p>
                          <p className="font-medium text-slate-900 flex items-center gap-1">
                            <User className="h-3 w-3" /> {serialData.customer?.name || "Walk-in Customer"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Sale Invoice</p>
                          <p className="font-medium text-slate-900 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {serialData.sale?.invoice_number}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Agar abhi tak IN_STOCK hai
                    <div className="flex flex-col gap-2 opacity-60">
                      <h3 className="text-lg font-bold text-slate-500 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" /> Pending Sale
                      </h3>
                      <p className="text-sm text-slate-400">Yeh item abhi tak kisi customer ko nahi bika aur stock mein mojood hai.</p>
                    </div>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}