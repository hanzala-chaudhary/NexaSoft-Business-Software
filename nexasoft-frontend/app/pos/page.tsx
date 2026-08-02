"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Printer, Trash2, Plus, Minus, Search, CheckCircle2, X, AlertCircle, User, Phone } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const SHOP = {
  name: "Tayyab & Hassan Traders",
  tagline: "Importer & Distributor of Computer Parts",
  addressLine1: "Shop # 2, Dawood Plaza,",
  addressLine2: "Near China Center, Hall Road, Lahore",
  phones: "0323-4072182 | 0328-1828034",
};

const SOFTWARE = { name: "NexaSoft Business Software", phone: "0370-5407699" };

interface CartItem {
  productId: string;
  name: string;
  salePrice: number;
  quantity: number;
  serialNumbers: string[];
}

interface CustomerDetails {
  name: string;
  phone: string;
}

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [gridProducts, setGridProducts] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isScanningStatus, setIsScanningStatus] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerDetails>({ name: "Walk-in Customer", phone: "" });

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const [soldInfoOpen, setSoldInfoOpen] = useState(false);
  const [soldInfoData, setSoldInfoData] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
      setGridProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setGridProducts(products);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        setGridProducts(data);
      } catch (error) {
        console.error("POS search error:", error);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, products]);

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.productId === product.id);

    if (existing && existing.serialNumbers.length > 0) {
      alert(`"${product.name}" is cart mein serial scan se add hua hai. Quantity badhane ke liye ek aur unit scan karein.`);
      return;
    }

    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + 1 > Number(product.opening_stock)) {
      alert(`"${product.name}" ka sirf ${product.opening_stock} stock available hai!`);
      return;
    }

    if (existing) {
      setCart(cart.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, salePrice: Number(product.salePrice), quantity: 1, serialNumbers: [] }]);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.productId === productId && item.serialNumbers.length === 0) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const removeSerialFromCart = (productId: string, serial: string) => {
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    const newSerials = item.serialNumbers.filter((s) => s !== serial);
    if (newSerials.length === 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map((i) => (i.productId === productId ? { ...i, serialNumbers: newSerials, quantity: newSerials.length } : i)));
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

  const handleScanEnter = async () => {
    const code = searchQuery.trim();
    if (!code) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsScanningStatus(true);

    try {
      const serialRes = await fetch(`${API_URL}/serial/${encodeURIComponent(code)}`);
      if (serialRes.ok) {
        const data = await serialRes.json();
        if (data.status === "IN_STOCK") {
          addScannedSerialToCart(data);
        } else {
          setSoldInfoData(data);
          setSoldInfoOpen(true);
        }
        return;
      }

      const matched = products.find((p) => p.master_barcode === code || p.sku === code);
      if (matched) {
        addToCart(matched);
      }
    } catch (error) {
      console.error("Scanner error:", error);
    } finally {
      setSearchQuery("");
      setIsScanningStatus(false);
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  };

  const addScannedSerialToCart = (serialData: any) => {
    const productId = serialData.product_id;
    const existing = cart.find((item) => item.productId === productId);

    if (existing && existing.serialNumbers.length === 0 && existing.quantity > 0) {
      alert(`"${serialData.products.name}" pehle hi bina-serial ke cart mein hai. Pehle usse remove karein, phir scan karein.`);
      return;
    }

    if (existing && existing.serialNumbers.includes(serialData.serial_number)) {
      alert("Ye serial number pehle hi cart mein hai!");
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.serialNumbers.length + 1, serialNumbers: [...item.serialNumbers, serialData.serial_number] }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          productId,
          name: serialData.products.name,
          salePrice: Number(serialData.products.salePrice),
          quantity: 1,
          serialNumbers: [serialData.serial_number],
        },
      ]);
    }
  };

  const openCheckout = () => {
    setCheckoutError("");
    setCustomerInfo({ name: "Walk-in Customer", phone: "" });
    setIsCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isSaving) return;
    setCheckoutError("");

    try {
      setIsSaving(true);

      const trimmedName = customerInfo.name.trim();
      const trimmedPhone = customerInfo.phone.trim();

      // Sirf tab customer record banao jab naam diya gaya ho aur wo default "Walk-in" na ho
      let customerId: string | undefined = undefined;
      if (trimmedName && trimmedName !== "Walk-in Customer") {
        const custRes = await fetch(`${API_URL}/customers/find-or-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, phone: trimmedPhone || undefined }),
        });
        if (custRes.ok) {
          const custData = await custRes.json();
          customerId = custData.id;
        }
      }

      const formattedItems = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        serialNumbers: item.serialNumbers,
      }));

      const res = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount,
          paymentStatus: "PAID",
          customerId,
          items: formattedItems,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Checkout failed");

      setLastInvoice({
        ...result,
        items: cart,
        customerName: trimmedName || "Walk-in Customer",
        customerPhone: trimmedPhone || undefined,
      });
      setCart([]);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      fetchProducts();
    } catch (error: any) {
      setCheckoutError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!lastInvoice) return;

    const itemsHtml = (lastInvoice.items || [])
      .map((item: any) => {
        const lineTotal = (item.salePrice * item.quantity).toLocaleString();
        const serials = item.serialNumbers?.length
          ? `<div class="sn">S/N: ${item.serialNumbers.join(", ")}</div>`
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

    const customerHtml =
      lastInvoice.customerName && lastInvoice.customerName !== "Walk-in Customer"
        ? `<div class="divider"></div>
           <div class="row"><span>Customer:</span><span style="font-weight:bold;">${lastInvoice.customerName}</span></div>
           ${lastInvoice.customerPhone ? `<div class="row"><span>Phone:</span><span>${lastInvoice.customerPhone}</span></div>` : ""}`
        : `<div class="divider"></div><div class="row"><span>Customer:</span><span>Walk-in Customer</span></div>`;

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt ${lastInvoice.invoice_number || ""}</title>
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
          ${customerHtml}
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

  const totalAmountFallback = (invoice: any) =>
    (invoice?.items || []).reduce((s: number, it: any) => s + it.salePrice * it.quantity, 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;

      if (isReceiptOpen) {
        e.preventDefault();
        handlePrint();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReceiptOpen, isCheckoutOpen, isSaving, lastInvoice, cart]);

  return (
    <div className="flex h-full gap-6 p-6 bg-slate-50">
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            ref={searchInputRef}
            placeholder="Scan Barcode ya Serial Number... (Enter dabayein)"
            className={`pl-10 h-12 text-lg shadow-sm border-slate-200 bg-white transition-all ${isScanningStatus ? "border-indigo-500 ring-2 ring-indigo-200" : ""}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScanEnter();
              }
            }}
            autoFocus
          />
          {isScanningStatus && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 animate-pulse">
              Scanning...
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20">
          {gridProducts.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-95"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-32">
                <p className="font-semibold text-slate-800 line-clamp-2">{product.name}</p>
                <Badge variant={product.opening_stock > 0 ? "secondary" : "destructive"}>Stock: {product.opening_stock}</Badge>
                <p className="font-bold text-indigo-600">Rs. {Number(product.salePrice).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="w-[400px] flex flex-col shadow-lg border-slate-200 h-[calc(100vh-6rem)]">
        <CardHeader className="border-b bg-white pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-600" />
              <span>Current Bill</span>
            </div>
            <Badge variant="outline" className="text-slate-500 font-mono text-xs">
              {cart.length} Items
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-y-auto bg-white">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.productId} className="p-4 flex flex-col gap-2 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-sm text-indigo-600 font-bold">Rs. {item.salePrice.toLocaleString()}</p>
                    </div>

                    {item.serialNumbers.length === 0 ? (
                      <div className="flex items-center gap-2 bg-white border rounded-md">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-4 text-center font-medium">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Badge className="bg-indigo-100 text-indigo-700">{item.quantity} scanned</Badge>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 ml-2" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {item.serialNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.serialNumbers.map((serial) => (
                        <span key={serial} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                          {serial}
                          <button onClick={() => removeSerialFromCart(item.productId, serial)} className="hover:text-rose-600 ml-1">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
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
            onClick={openCheckout}
          >
            Pay &amp; Checkout
          </Button>
        </div>
      </Card>

      <Dialog open={soldInfoOpen} onOpenChange={setSoldInfoOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Ye Unit Pehle Se Bik Chuki Hai
            </DialogTitle>
          </DialogHeader>
          {soldInfoData && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Product</span>
                <span className="font-semibold">{soldInfoData.products?.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Serial Number</span>
                <span className="font-mono">{soldInfoData.serial_number}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Status</span>
                <Badge variant="outline">{soldInfoData.status?.replace("_", " ")}</Badge>
              </div>
              {soldInfoData.sale && (
                <>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Sale Invoice</span>
                    <span className="font-medium">{soldInfoData.sale.invoice_number}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Sale Date</span>
                    <span>{new Date(soldInfoData.sale.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer</span>
                    <span>{soldInfoData.customer?.name || "Walk-in Customer"}</span>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSoldInfoOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Complete Sale</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <User className="h-4 w-4" /> Customer Details
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customerName" className="text-xs text-slate-500">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="customerName"
                      placeholder="Walk-in Customer"
                      className="pl-9 bg-white"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customerPhone" className="text-xs text-slate-500">Phone Number (Optional — repeat customer track karta hai)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="customerPhone"
                      placeholder="03XX-XXXXXXX"
                      className="pl-9 bg-white"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              {checkoutError && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 text-left mb-4">{checkoutError}</div>
              )}
              <div className="bg-indigo-50 text-indigo-700 p-4 rounded-lg shadow-inner border border-indigo-100">
                <p className="text-sm font-medium">Total Amount to Collect</p>
                <h2 className="text-4xl font-black mt-1">Rs. {totalAmount.toLocaleString()}</h2>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={handleCheckout} disabled={isSaving}>
              {isSaving ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
              {isSaving ? "Processing Payment..." : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-emerald-600 text-xl font-bold">
              <CheckCircle2 className="h-6 w-6" /> Sale Successful!
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 bg-slate-100 rounded-md flex justify-center overflow-hidden my-2">
            <div className="bg-white p-4 w-[80mm] text-black font-mono text-[12px] leading-tight rounded shadow-sm border border-slate-200">
              <div className="text-center mb-1">
                <h2 className="font-bold text-base leading-tight">{SHOP.name}</h2>
                <p className="text-[9.5px] mt-0.5">{SHOP.tagline}</p>
                <p className="text-[10px] mt-1 leading-snug">{SHOP.addressLine1}<br />{SHOP.addressLine2}</p>
                <p className="text-[10px]">Ph: {SHOP.phones}</p>
              </div>
              <div className="border-t-2 border-black my-2"></div>
              <div className="text-[10.5px] space-y-0.5">
                <div className="flex justify-between"><span>Invoice #</span><span>{lastInvoice?.invoice_number || "-"}</span></div>
                <div className="flex justify-between"><span>Date</span><span>{new Date().toLocaleString()}</span></div>
              </div>

              <div className="border-b border-dashed border-black my-2"></div>
              <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold truncate max-w-[150px] text-right">
                    {lastInvoice?.customerName || "Walk-in Customer"}
                  </span>
                </div>
                {lastInvoice?.customerPhone && (
                  <div className="flex justify-between"><span>Phone:</span><span>{lastInvoice.customerPhone}</span></div>
                )}
              </div>

              <div className="border-b border-dashed border-black my-2"></div>
              <div className="flex justify-between text-[10px] font-bold uppercase"><span>Item</span><span>Amount</span></div>
              <div className="border-b border-dashed border-black my-2"></div>
              <div className="space-y-2">
                {lastInvoice?.items?.map((item: any, i: number) => (
                  <div key={i}>
                    <p className="font-bold text-[11.5px]">{item.name}</p>
                    <div className="flex justify-between text-[10.5px]">
                      <span>{item.quantity} x Rs. {item.salePrice.toLocaleString()}</span>
                      <span className="font-bold">Rs. {(item.salePrice * item.quantity).toLocaleString()}</span>
                    </div>
                    {item.serialNumbers?.length > 0 && (
                      <p className="text-[9px] text-slate-600 mt-1 leading-tight">S/N: {item.serialNumbers.join(", ")}</p>
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

          <p className="text-center text-xs text-slate-400">Press <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono">Enter</kbd> to print instantly</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>Close</Button>
            <Button className="bg-indigo-600 gap-2 hover:bg-indigo-700" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}