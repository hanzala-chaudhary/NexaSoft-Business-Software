"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Printer, Trash2, Plus, Minus, Search, CheckCircle2 } from "lucide-react";

// ─── SHOP / BRANDING INFO (single source of truth — edit here only) ───
const SHOP = {
  name: "Tayyab & Hassan Traders",
  tagline: "Importer & Distributor of Computer Parts",
  addressLine1: "Shop # 2, Dawood Plaza,",
  addressLine2: "Near China Center, Hall Road, Lahore",
  phones: "0323-4072182 | 0328-1828034",
};

// Software-house branding shown at the bottom of every receipt
const SOFTWARE = {
  name: "NexaSoft Business Software",
  phone: "0370-5407699",
};

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Products (real backend — unchanged) ───
  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:4000/products");
      setProducts(await res.json());
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.includes(searchQuery) ||
    p.master_barcode?.includes(searchQuery)
  );

  // ─── Cart Functions ───
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        salePrice: Number(product.salePrice),
        quantity: 1,
        serialNumbersText: ""
      }]);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const updateSerialText = (productId: string, text: string) => {
    setCart(cart.map(item => item.productId === productId ? { ...item, serialNumbersText: text } : item));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);

  // ─── Checkout (save sale to real backend — unchanged logic) ───
  const handleCheckout = async () => {
    if (cart.length === 0 || isSaving) return;

    try {
      setIsSaving(true);

      for (const item of cart) {
        const serials = item.serialNumbersText.split('\n').map((s: string) => s.trim()).filter((s: string) => s !== "");
        if (serials.length > 0 && serials.length !== item.quantity) {
          setIsSaving(false);
          return alert(`Masla: ${item.name} ki quantity ${item.quantity} hai, par aap ne ${serials.length} serial numbers dale hain!`);
        }
      }

      const formattedItems = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        serialNumbers: item.serialNumbersText.split('\n').map((s: string) => s.trim()).filter((s: string) => s !== "")
      }));

      const res = await fetch("http://localhost:4000/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount,
          paymentStatus: "PAID",
          items: formattedItems
        }),
      });

      if (!res.ok) throw new Error("Checkout failed");

      const savedSale = await res.json();

      setLastInvoice({ ...savedSale, items: cart });
      setCart([]);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      fetchProducts();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Professional thermal-print handler (own print window = correct alignment) ───
  const handlePrint = () => {
    if (!lastInvoice) return;

    const itemsHtml = (lastInvoice.items || [])
      .map((item: any) => {
        const lineTotal = (item.salePrice * item.quantity).toLocaleString();
        const serials = item.serialNumbersText
          ? `<div class="sn">S/N: ${item.serialNumbersText.replace(/\n/g, ", ")}</div>`
          : "";
        return `
          <div class="item-name">${item.name}</div>
          <div class="row">
            <span class="qty">${item.quantity} x Rs. ${Number(item.salePrice).toLocaleString()}</span>
            <span class="amount">Rs. ${lineTotal}</span>
          </div>
          ${serials}
        `;
      })
      .join("");

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt ${lastInvoice.invoice_number || ""}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 10px 12px 16px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              width: 80mm;
            }
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
            .footer-label { font-size: 8.5px; }
            .footer-brand { font-size: 10.5px; font-weight: 800; margin: 1px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="shop-name">${SHOP.name}</div>
            <div class="tagline">${SHOP.tagline}</div>
            <div class="addr">${SHOP.addressLine1}<br/>${SHOP.addressLine2}</div>
            <div class="addr">Ph: ${SHOP.phones}</div>
          </div>

          <div class="divider-solid"></div>

          <div class="meta">
            <div class="row"><span>Invoice #</span><span>${lastInvoice.invoice_number || "-"}</span></div>
            <div class="row"><span>Date</span><span>${new Date().toLocaleString()}</span></div>
          </div>

          <div class="divider"></div>
          <div class="col-head"><span>Item</span><span>Amount</span></div>
          <div class="divider"></div>

          ${itemsHtml}

          <div class="divider-solid"></div>
          <div class="total-row"><span>TOTAL</span><span>Rs. ${Number(lastInvoice.total_amount || totalAmountFallback(lastInvoice)).toLocaleString()}</span></div>
          <div class="divider"></div>

          <div class="thankyou">Thank you for your business!</div>

          <div class="footer-box">
            <div class="footer-label">Powered by</div>
            <div class="footer-brand">${SOFTWARE.name}</div>
            <div class="footer-label">${SOFTWARE.phone}</div>
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

  // Fallback total if backend didn't echo total_amount on the saved sale
  const totalAmountFallback = (invoice: any) =>
    (invoice?.items || []).reduce((s: number, it: any) => s + it.salePrice * it.quantity, 0);

  // ─── Fast keyboard workflow: Enter confirms / prints without touching the mouse ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;

      if (isReceiptOpen) {
        e.preventDefault();
        handlePrint();
        return;
      }

      if (isCheckoutOpen) {
        e.preventDefault();
        if (!isSaving) handleCheckout();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReceiptOpen, isCheckoutOpen, isSaving, lastInvoice, cart]);

  return (
    <div className="flex h-full gap-6 p-6 bg-slate-50">

      {/* ─── LEFT: PRODUCT CATALOG ─── */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            ref={searchInputRef}
            placeholder="Scan Barcode or Search Product..."
            className="pl-10 h-12 text-lg shadow-sm border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className="cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-95"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-32">
                <p className="font-semibold text-slate-800 line-clamp-2">{product.name}</p>
                <Badge variant={product.opening_stock > 0 ? "secondary" : "destructive"}>
                  Stock: {product.opening_stock}
                </Badge>
                <p className="font-bold text-indigo-600">Rs. {Number(product.salePrice).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── RIGHT: CART (BILL) ─── */}
      <Card className="w-[400px] flex flex-col shadow-lg border-slate-200 h-[calc(100vh-6rem)]">
        <CardHeader className="border-b bg-white pb-4">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" /> Current Bill
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map(item => (
                <div key={item.productId} className="p-4 flex flex-col gap-3 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-sm text-indigo-600 font-bold">Rs. {item.salePrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border rounded-md">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-4 text-center font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 ml-2" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="w-full">
                    <textarea
                      className="w-full text-xs p-2 border rounded-md"
                      rows={2}
                      placeholder={`Scan Serial Numbers here (Need ${item.quantity})`}
                      value={item.serialNumbersText}
                      onChange={(e) => updateSerialText(item.productId, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t bg-white space-y-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-slate-600">Total:</span>
            <span className="font-bold text-2xl text-slate-900">Rs. {totalAmount.toLocaleString()}</span>
          </div>
          <Button
            className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-md"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            Pay &amp; Checkout
          </Button>
        </div>
      </Card>

      {/* ─── MODAL: CHECKOUT CONFIRMATION (press Enter to confirm) ─── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Checkout</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            <div className="bg-indigo-50 text-indigo-700 p-4 rounded-lg">
              <p className="text-sm">Amount to Collect</p>
              <h2 className="text-4xl font-bold mt-1">Rs. {totalAmount.toLocaleString()}</h2>
            </div>
            <p className="text-xs text-slate-400">Press <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded">Enter</kbd> to confirm instantly</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCheckout} disabled={isSaving}>
              {isSaving ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: RECEIPT (press Enter to print instantly) ─── */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" /> Sale Successful!
            </DialogTitle>
          </DialogHeader>

          {/* On-screen receipt preview — mirrors the printed layout */}
          <div className="p-4 bg-slate-100 rounded-md flex justify-center overflow-hidden">
            <div
              ref={receiptRef}
              className="bg-white p-4 w-[80mm] text-black font-mono text-[12px] leading-tight rounded shadow-sm"
            >
              <div className="text-center mb-1">
                <h2 className="font-bold text-base leading-tight">{SHOP.name}</h2>
                <p className="text-[9.5px] mt-0.5">{SHOP.tagline}</p>
                <p className="text-[10px] mt-1 leading-snug">
                  {SHOP.addressLine1}<br />{SHOP.addressLine2}
                </p>
                <p className="text-[10px]">Ph: {SHOP.phones}</p>
              </div>

              <div className="border-t-2 border-black my-2"></div>

              <div className="text-[10.5px] space-y-0.5">
                <div className="flex justify-between"><span>Invoice #</span><span>{lastInvoice?.invoice_number || "-"}</span></div>
                <div className="flex justify-between"><span>Date</span><span>{new Date().toLocaleString()}</span></div>
              </div>

              <div className="border-b border-dashed border-black my-2"></div>
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Item</span><span>Amount</span>
              </div>
              <div className="border-b border-dashed border-black my-2"></div>

              <div className="space-y-2">
                {lastInvoice?.items?.map((item: any, i: number) => (
                  <div key={i}>
                    <p className="font-bold text-[11.5px]">{item.name}</p>
                    <div className="flex justify-between text-[10.5px]">
                      <span>{item.quantity} x Rs. {item.salePrice.toLocaleString()}</span>
                      <span className="font-bold">Rs. {(item.salePrice * item.quantity).toLocaleString()}</span>
                    </div>
                    {item.serialNumbersText && (
                      <p className="text-[9px] text-slate-600">S/N: {item.serialNumbersText.replace(/\n/g, ', ')}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black mt-3 pt-2">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL:</span>
                  <span>Rs. {Number(lastInvoice?.total_amount || totalAmountFallback(lastInvoice)).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-center mt-4 text-[10.5px] font-semibold">Thank you for your business!</p>

              <div className="text-center mt-2 border border-black rounded p-1.5 text-[9px] leading-relaxed">
                <p>Powered by</p>
                <p className="font-black text-[10.5px]">{SOFTWARE.name}</p>
                <p>{SOFTWARE.phone}</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 -mt-2">Press <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded">Enter</kbd> to print instantly</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>Close</Button>
            <Button className="bg-indigo-600 gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}