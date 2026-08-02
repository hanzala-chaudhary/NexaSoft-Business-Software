"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, FileText, Printer, Loader2, ExternalLink, Calendar, User, Undo2, ArrowLeft, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Return/Refund State
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [returnSelection, setReturnSelection] = useState<Record<string, { quantity: number; serials: string[] }>>({});

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/sales`);
      if (!res.ok) throw new Error("Failed to fetch sales");
      const data = await res.json();
      setSales(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) => {
    const query = searchQuery.toLowerCase();
    const invoiceMatch = sale.invoice_number?.toLowerCase().includes(query);
    const customerMatch = sale.customer?.name?.toLowerCase().includes(query) || (query === "walk-in" && !sale.customer);
    return invoiceMatch || customerMatch;
  });

  const handleViewInvoice = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/sales/${id}`);
      if (!res.ok) throw new Error("Failed to fetch sale details");
      const data = await res.json();
      setSelectedSale(data);
      setIsReturnMode(false); // Reset return mode
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      alert("Invoice details load nahi ho sakin!");
    }
  };

  // --- RETURN LOGIC ---
  const startReturnMode = () => {
    // Initialize return selection state
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
      alert("Return karne ke liye kam az kam ek item select karein!");
      return;
    }

    if (!window.confirm("Kya aap waqai in items ko return karna chahte hain? Stock wapas add ho jayega.")) return;

    try {
      setIsReturning(true);
      const res = await fetch(`${API_URL}/sales/${selectedSale.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsToReturn })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Return process fail ho gaya");

      alert(`Return successful! Rs. ${result.refundAmount.toLocaleString()} refunded.`);
      setIsModalOpen(false);
      fetchSales(); // Refresh the list
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsReturning(false);
    }
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
      alert("Popup blocked. Please allow popups for printing.");
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

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales History</h1>
          <p className="text-sm text-slate-500 mt-1">Apni tamam purani sales, invoices aur returns ka record yahan se manage karein.</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b bg-white pb-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by Invoice # (e.g. INV-123) or Customer Name..."
              className="pl-9 bg-slate-50 border-slate-200 text-base h-11 focus-visible:ring-indigo-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-600">Date & Time</TableHead>
                <TableHead className="font-bold text-slate-600">Invoice Number</TableHead>
                <TableHead className="font-bold text-slate-600">Customer</TableHead>
                <TableHead className="text-center font-bold text-slate-600">Items</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Total Amount</TableHead>
                <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
                <TableHead className="text-center font-bold text-slate-600">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center flex-col items-center justify-center text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-slate-600 font-medium">
                      {new Date(sale.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span className="text-xs text-slate-400 block">{new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-indigo-700 bg-indigo-50 border-indigo-200">
                        {sale.invoice_number}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.customer ? (
                        <div className="font-semibold text-slate-800">{sale.customer.name}</div>
                      ) : (
                        <div className="text-slate-500 italic">Walk-in Customer</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{sale.items?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      Rs. {Number(sale.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {sale.payment_status === 'REFUNDED' ? (
                        <Badge className="bg-rose-100 text-rose-700 border-none">REFUNDED</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-none">PAID</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 font-semibold" onClick={() => handleViewInvoice(sale.id)}>
                        <ExternalLink className="h-4 w-4 mr-2" /> View
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
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isReturnMode && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setIsReturnMode(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <span>{isReturnMode ? "Process Return / Refund" : "Invoice Details"}</span>
              </div>
              <Badge variant="outline" className="font-mono text-sm bg-slate-100">{selectedSale?.invoice_number}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedSale ? (
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2">
              {!isReturnMode && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" /> Customer</p>
                    <p className="font-bold text-slate-800">{selectedSale.customer?.name || "Walk-in Customer"}</p>
                    {selectedSale.customer?.phone && <p className="text-sm text-slate-500">{selectedSale.customer.phone}</p>}
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center justify-end gap-1"><Calendar className="h-3 w-3" /> Date & Time</p>
                    <p className="font-bold text-slate-800">{new Date(selectedSale.created_at).toLocaleDateString()}</p>
                    <p className="text-sm text-slate-500">{new Date(selectedSale.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">
                  {isReturnMode ? "Select Items to Return" : "Purchased Items"}
                </h3>
                <div className="space-y-3">
                  {selectedSale.items?.map((item: any, idx: number) => {
                    const serials = selectedSale.serialized_products
                      ?.filter((sp: any) => sp.product_id === item.product_id)
                      .map((sp: any) => sp.serial_number);
                    
                    const isSerialized = serials?.length > 0;
                    const returnData = returnSelection[item.product_id];

                    return (
                      <div key={idx} className={`p-4 rounded-lg border shadow-sm flex flex-col gap-3 ${isReturnMode && returnData?.quantity > 0 ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900">{item.product?.name || "Unknown Product"}</p>
                            <p className="text-sm text-indigo-600 font-semibold">Rs. {Number(item.sale_price).toLocaleString()} <span className="text-slate-400 font-normal">x {item.quantity} (Purchased)</span></p>
                          </div>
                          {!isReturnMode && (
                            <p className="font-black text-slate-900">Rs. {(Number(item.sale_price) * item.quantity).toLocaleString()}</p>
                          )}
                        </div>
                        
                        {/* Normal View: Show Serials */}
                        {!isReturnMode && isSerialized && (
                          <div className="bg-slate-50 p-2 rounded text-xs border border-slate-100">
                            <span className="font-semibold text-slate-500 mr-2">Serial Numbers:</span>
                            <span className="font-mono text-slate-700">{serials.join(", ")}</span>
                          </div>
                        )}

                        {/* Return Mode View: Selection Controls */}
                        {isReturnMode && (
                          <div className="pt-2 border-t border-slate-100">
                            {isSerialized ? (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-500">Select serials to return:</p>
                                <div className="flex flex-wrap gap-2">
                                  {serials.map((sn: string) => {
                                    const isSelected = returnData?.serials.includes(sn);
                                    return (
                                      <button
                                        key={sn}
                                        onClick={() => toggleReturnSerial(item.product_id, sn)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all border ${
                                          isSelected 
                                            ? 'bg-rose-100 border-rose-300 text-rose-700' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        {sn}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-500">Return Quantity:</p>
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max={item.quantity}
                                    value={returnData?.quantity || 0}
                                    onChange={(e) => handleReturnQtyChange(item.product_id, parseInt(e.target.value) || 0, item.quantity)}
                                    className="w-20 rounded-md border border-slate-200 px-3 py-1 text-sm text-center font-bold"
                                  />
                                  <span className="text-xs text-slate-400">/ {item.quantity}</span>
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
            <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
          )}

          <div className="border-t pt-4 mt-auto space-y-4 bg-white">
            {!isReturnMode ? (
              <>
                <div className="flex justify-between items-center px-2">
                  <span className="text-lg font-bold text-slate-600">Grand Total</span>
                  <span className="text-3xl font-black text-indigo-700">Rs. {Number(selectedSale?.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 font-bold" onClick={() => setIsModalOpen(false)}>Close</Button>
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold shadow-sm" onClick={handleReprint}>
                    <Printer className="h-4 w-4" /> Print Receipt
                  </Button>
                  {selectedSale?.payment_status !== 'REFUNDED' && (
                    <Button className="flex-1 bg-rose-600 hover:bg-rose-700 gap-2 font-bold shadow-sm" onClick={startReturnMode}>
                      <Undo2 className="h-4 w-4" /> Return Items
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center px-2 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <span className="text-sm font-bold text-rose-700">Refund Estimation</span>
                  <span className="text-xl font-black text-rose-700">
                    Rs. {Object.entries(returnSelection).reduce((sum, [productId, data]) => {
                      const item = selectedSale.items.find((i: any) => i.product_id === productId);
                      return sum + (Number(item?.sale_price || 0) * data.quantity);
                    }, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 font-bold" onClick={() => setIsReturnMode(false)} disabled={isReturning}>Cancel Return</Button>
                  <Button className="flex-1 bg-rose-600 hover:bg-rose-700 gap-2 font-bold shadow-sm" onClick={submitReturn} disabled={isReturning}>
                    {isReturning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm Return
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}