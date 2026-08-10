"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Search,
  Plus,
  Loader2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Trash2,
  User,
  Building2,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};

type Party = { id: string; name: string; phone?: string | null };

export default function PaymentsPage() {
  // ------------------------------------------------------------------
  // List state
  // ------------------------------------------------------------------
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalReceived: 0, totalPaid: 0, netCashFlow: 0, todayCount: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------------------------------------------------------------------
  // Add Payment dialog state
  // ------------------------------------------------------------------
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [payType, setPayType] = useState<"CUSTOMER_RECEIPT" | "SUPPLIER_PAYMENT">("CUSTOMER_RECEIPT");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState<Party[]>([]);
  const [isPartySearching, setIsPartySearching] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const partyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Fetch payments
  // ------------------------------------------------------------------
  const buildQuery = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    params.set("limit", "20");
    if (search.trim()) params.set("search", search.trim());
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (methodFilter !== "ALL") params.set("method", methodFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  };

  const fetchPayments = async (targetPage = 1, append = false) => {
    try {
      append ? setIsLoadingMore(true) : setIsLoading(true);
      const res = await fetch(`${API_URL}/payments?${buildQuery(targetPage)}`);
      const data = await res.json();

      const rows = Array.isArray(data?.data) ? data.data : [];
      setPayments((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(Number(data?.total ?? rows.length));
      setSummary({
        totalReceived: Number(data?.summary?.totalReceived ?? 0),
        totalPaid: Number(data?.summary?.totalPaid ?? 0),
        netCashFlow: Number(data?.summary?.netCashFlow ?? 0),
        todayCount: Number(data?.summary?.todayCount ?? 0),
      });
      setPage(targetPage);
    } catch (error) {
      console.error("Payments Fetch Error:", error);
      if (!append) {
        setPayments([]);
        setTotal(0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPayments(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchPayments(1, false), 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, methodFilter, dateFrom, dateTo]);

  // ------------------------------------------------------------------
  // Party search (customers or suppliers depending on payType)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isDialogOpen) return;
    if (partyDebounce.current) clearTimeout(partyDebounce.current);

    if (!partyQuery.trim()) {
      setPartyResults([]);
      return;
    }

    partyDebounce.current = setTimeout(async () => {
      try {
        setIsPartySearching(true);
        const endpoint = payType === "CUSTOMER_RECEIPT" ? "customers" : "suppliers";
        const res = await fetch(`${API_URL}/${endpoint}?search=${encodeURIComponent(partyQuery.trim())}`);
        const data = await res.json();
        setPartyResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch (error) {
        console.error("Party search error:", error);
        setPartyResults([]);
      } finally {
        setIsPartySearching(false);
      }
    }, 300);

    return () => {
      if (partyDebounce.current) clearTimeout(partyDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyQuery, payType, isDialogOpen]);

  function resetForm() {
    setPayType("CUSTOMER_RECEIPT");
    setAmount("");
    setMethod("CASH");
    setReferenceNumber("");
    setNotes("");
    setSelectedParty(null);
    setPartyQuery("");
    setPartyResults([]);
    setFormError("");
    setSuccessMsg("");
  }

  function switchType(next: "CUSTOMER_RECEIPT" | "SUPPLIER_PAYMENT") {
    if (next === payType) return;
    setPayType(next);
    setSelectedParty(null);
    setPartyQuery("");
    setPartyResults([]);
    setFormError("");
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    const numericAmount = Number(amount);
    if (!selectedParty) {
      setFormError(payType === "CUSTOMER_RECEIPT" ? "Pehle customer select karein." : "Pehle supplier select karein.");
      return;
    }
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("Amount valid aur 0 se zyada hona chahiye.");
      return;
    }

    try {
      setIsSaving(true);
      const body = {
        amount: numericAmount,
        method,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      // Use the existing, already-tested endpoints so allocation logic stays
      // in one place (CustomersService / SuppliersService), never duplicated here.
      const endpoint =
        payType === "CUSTOMER_RECEIPT"
          ? `${API_URL}/customers/${selectedParty.id}/receive-payment`
          : `${API_URL}/suppliers/${selectedParty.id}/pay`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Payment save nahi ho saka!");

      await fetchPayments(1, false);

      const appliedCount = result.appliedToSalesCount ?? result.appliedToPurchasesCount ?? 0;
      const appliedInfo = appliedCount > 0 ? ` ${appliedCount} invoice(s) par apply hui.` : "";
      const advanceInfo =
        result.advanceAmount > 0
          ? ` Rs. ${Number(result.advanceAmount).toLocaleString()} advance/on-account rakha gaya.`
          : "";
      setSuccessMsg(`Payment record ho gayi.${appliedInfo}${advanceInfo}`);

      setTimeout(() => {
        setIsDialogOpen(false);
        resetForm();
      }, 1200);
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(payment: any) {
    if (!window.confirm("Kya aap is payment ko void karna chahte hain? Related invoice ka balance wapis update ho jayega.")) {
      return;
    }
    try {
      setDeletingId(payment.id);
      const isCustomerSide = payment.party?.kind === "customer" || payment.type === "CUSTOMER_RECEIPT";
      const endpoint = isCustomerSide
        ? `${API_URL}/customers/payments/${payment.id}/void`
        : `${API_URL}/suppliers/payments/${payment.id}/void`;

      const res = await fetch(endpoint, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Payment void nahi ho saki!");
      await fetchPayments(1, false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  const hasMore = payments.length < total;

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500 mt-1">Customer receipts aur supplier payments ek jagah manage karein.</p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold shadow-sm">
              <Plus className="h-4 w-4" /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddPayment}>
              <DialogHeader>
                <DialogTitle>Record New Payment</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {formError && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 font-semibold border border-rose-100">
                    {formError}
                  </div>
                )}
                {successMsg && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 font-semibold border border-emerald-100">
                    {successMsg}
                  </div>
                )}

                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => switchType("CUSTOMER_RECEIPT")}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors ${
                      payType === "CUSTOMER_RECEIPT"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <ArrowDownCircle className="h-4 w-4" /> From Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => switchType("SUPPLIER_PAYMENT")}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors ${
                      payType === "SUPPLIER_PAYMENT"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <ArrowUpCircle className="h-4 w-4" /> To Supplier
                  </button>
                </div>

                {/* Party search */}
                <div className="space-y-1.5 relative">
                  <Label>
                    {payType === "CUSTOMER_RECEIPT" ? "Customer" : "Supplier"} <span className="text-rose-500">*</span>
                  </Label>

                  {selectedParty ? (
                    <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
                        {payType === "CUSTOMER_RECEIPT" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        {selectedParty.name}
                        {selectedParty.phone ? ` (${selectedParty.phone})` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedParty(null)}
                        className="text-indigo-400 hover:text-indigo-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder={payType === "CUSTOMER_RECEIPT" ? "Customer ka naam ya phone search karein..." : "Supplier ka naam ya phone search karein..."}
                          className="pl-9"
                          value={partyQuery}
                          onChange={(e) => {
                            setPartyQuery(e.target.value);
                            setShowPartyDropdown(true);
                          }}
                          onFocus={() => setShowPartyDropdown(true)}
                        />
                      </div>
                      {showPartyDropdown && partyQuery.trim() && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                          {isPartySearching ? (
                            <div className="p-3 text-center text-sm text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          ) : partyResults.length === 0 ? (
                            <div className="p-3 text-center text-sm text-slate-400">Koi match nahi mila.</div>
                          ) : (
                            partyResults.map((p) => (
                              <button
                                type="button"
                                key={p.id}
                                onClick={() => {
                                  setSelectedParty(p);
                                  setShowPartyDropdown(false);
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-indigo-50"
                              >
                                <span className="font-medium text-slate-700">{p.name}</span>
                                {p.phone && <span className="text-xs text-slate-400">{p.phone}</span>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Amount (Rs.) <span className="text-rose-500">*</span></Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Method</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Reference Number (optional)</Label>
                  <Input
                    placeholder="Cheque no. / transaction id..."
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Koi additional note..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <p className="text-xs text-slate-400">
                  Payment automatically sabse purani outstanding invoice(s) par apply hogi. Agar dues se zyada amount di
                  gayi to baqi advance ke tor par record ho jayegi.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Saving..." : "Save Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Received</p>
              <p className="text-lg font-bold text-emerald-700">Rs. {summary.totalReceived.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
              <ArrowUpCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Paid</p>
              <p className="text-lg font-bold text-rose-700">Rs. {summary.totalPaid.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Net Cash Flow</p>
              <p className={`text-lg font-bold ${summary.netCashFlow >= 0 ? "text-indigo-700" : "text-rose-700"}`}>
                Rs. {summary.netCashFlow.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <Receipt className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Today's Entries</p>
              <p className="text-lg font-bold text-slate-800">{summary.todayCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b bg-transparent pb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Naam, reference number ya note se search karein..."
                className="pl-9 bg-slate-50 border-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-[180px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CUSTOMER_RECEIPT">Customer Receipts</SelectItem>
                <SelectItem value="SUPPLIER_PAYMENT">Supplier Payments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full lg:w-[160px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Methods</SelectItem>
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-full lg:w-[150px] bg-slate-50 border-slate-200"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              className="w-full lg:w-[150px] bg-slate-50 border-slate-200"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                    <Wallet className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    Koi payment record nahi mila.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {p.type === "CUSTOMER_RECEIPT" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
                          <ArrowDownCircle className="h-3 w-3 mr-1" /> Received
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50">
                          <ArrowUpCircle className="h-3 w-3 mr-1" /> Paid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-slate-800">{p.party?.name ?? "-"}</p>
                      {p.party?.phone && <p className="text-xs text-slate-400">{p.party.phone}</p>}
                    </TableCell>
                    <TableCell>
                      {p.invoice ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {p.invoice.number}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">On account</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{METHOD_LABELS[p.method] ?? p.method}</TableCell>
                    <TableCell className="text-sm text-slate-500">{p.referenceNumber || "-"}</TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={p.type === "CUSTOMER_RECEIPT" ? "text-emerald-700" : "text-rose-700"}>
                        Rs. {Number(p.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                        className="text-slate-300 hover:text-rose-600 transition-colors disabled:opacity-50"
                        title="Void this payment"
                      >
                        {deletingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {hasMore && !isLoading && (
            <div className="flex justify-center border-t p-4">
              <Button
                variant="outline"
                onClick={() => fetchPayments(page + 1, true)}
                disabled={isLoadingMore}
                className="gap-2"
              >
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load More ({payments.length} / {total})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}