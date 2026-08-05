"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart, Printer, Trash2, Plus, Minus, Search,
  CheckCircle2, X, AlertCircle, User, Phone, Wallet, Package
} from "lucide-react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const SHOP = {
  name: "Tayyab & Hassan Traders",
  tagline: "Importer & Distributor of Computer Parts",
  addressLine1: "Shop # 2, Dawood Plaza,",
  addressLine2: "Near China Center, Hall Road, Lahore",
  phones: "0323-4072182 | 0328-1828034",
};

const SOFTWARE = { name: "NexaSoft Business Software", phone: "0370-5407699" };

// ─── TYPES ────────────────────────────────────────────────────────────────────
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

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function POSPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [gridProducts, setGridProducts] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isScanningStatus, setIsScanningStatus] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerDetails>({ name: "Walk-in Customer", phone: "" });

  // ── New features state ──
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const [soldInfoOpen, setSoldInfoOpen] = useState(false);
  const [soldInfoData, setSoldInfoData] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── DATA FETCHING ────────────────────────────────────────────────────────
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

  useEffect(() => { fetchProducts(); }, []);

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

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, products]);

  // ─── CART LOGIC ───────────────────────────────────────────────────────────
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
      setCart(cart.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        salePrice: Number(product.salePrice),
        quantity: 1,
        serialNumbers: [],
      }]);
    }
  };

  // FIX: Loose Pricing - price directly editable in cart
  const updateCartPrice = (productId: string, newPrice: number) => {
    setCart(cart.map((item) =>
      item.productId === productId ? { ...item, salePrice: newPrice } : item
    ));
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.productId === productId && item.serialNumbers.length === 0) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
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
      setCart(cart.map((i) =>
        i.productId === productId
          ? { ...i, serialNumbers: newSerials, quantity: newSerials.length }
          : i
      ));
    }
  };

  const subTotalAmount = cart.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const grandTotal = subTotalAmount - discount;
  const balanceAmount = grandTotal - (Number(paidAmount) || 0);

  // ─── SCANNER ──────────────────────────────────────────────────────────────
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
      if (matched) addToCart(matched);
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
      alert(`"${serialData.products?.name}" pehle hi bina-serial ke cart mein hai. Pehle usse remove karein, phir scan karein.`);
      return;
    }
    if (existing && existing.serialNumbers.includes(serialData.serial_number)) {
      alert("Ye serial number pehle hi cart mein hai!");
      return;
    }

    if (existing) {
      setCart(cart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.serialNumbers.length + 1, serialNumbers: [...item.serialNumbers, serialData.serial_number] }
          : item
      ));
    } else {
      setCart([...cart, {
        productId,
        name: serialData.products?.name ?? "Unknown Product",
        salePrice: Number(serialData.products?.salePrice ?? 0),
        quantity: 1,
        serialNumbers: [serialData.serial_number],
      }]);
    }
  };

  // ─── CHECKOUT ─────────────────────────────────────────────────────────────
  // FIX: paidAmount defaults to grandTotal (after discount) when dialog opens
  const openCheckout = () => {
    setCheckoutError("");
    setCustomerInfo({ name: "Walk-in Customer", phone: "" });
    setDiscount(0);
    setPaidAmount(subTotalAmount); // discount = 0 initially, so grandTotal = subTotal
    setPaymentMethod("CASH");
    setIsCheckoutOpen(true);
  };

  // FIX: when discount changes, auto-update paidAmount to new grandTotal
  const handleDiscountChange = (val: number) => {
    const d = val >= 0 ? val : 0;
    setDiscount(d);
    setPaidAmount(subTotalAmount - d); // keep paidAmount = full payment by default
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isSaving) return;
    setCheckoutError("");

    const trimmedName = customerInfo.name.trim();
    const trimmedPhone = customerInfo.phone.trim();

    // Validate: named customer needs phone (khata duplicate prevention)
    if (trimmedName && trimmedName !== "Walk-in Customer" && !trimmedPhone) {
      setCheckoutError("Customer ka khata banane ke liye Phone Number zaroori hai — duplicate naam rokne ke liye.");
      return;
    }

    try {
      setIsSaving(true);

      // Step 1: Find or create customer
      let customerId: string | undefined = undefined;
      if (trimmedName && trimmedName !== "Walk-in Customer" && trimmedPhone) {
        const custRes = await fetch(`${API_URL}/customers/find-or-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
        });
        if (custRes.ok) {
          const custData = await custRes.json();
          customerId = custData.id;
        } else {
          throw new Error("Customer record banane mein masla aaya.");
        }
      }

      // Step 2: Calculate payment status
      const finalPaid = Number(paidAmount) || 0;
      const gTotal = subTotalAmount - discount;
      let paymentStatus = "PAID";
      if (finalPaid <= 0) paymentStatus = "PENDING";
      else if (finalPaid < gTotal) paymentStatus = "PARTIAL";

      // Step 3: Build sale payload
      const payload = {
        totalAmount: subTotalAmount,       // sub-total before discount
        discount: discount,
        paidAmount: finalPaid,
        paymentMethod: paymentMethod,      // CASH | BANK_TRANSFER | CARD
        paymentStatus,
        customerId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          salePrice: item.salePrice,
          serialNumbers: item.serialNumbers,
        })),
      };

      // Step 4: POST to /sales
      const res = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Checkout failed");

      // Step 5: Show receipt
      setLastInvoice({
        ...result,
        items: cart,
        customerName: trimmedName || "Walk-in Customer",
        customerPhone: trimmedPhone || undefined,
        discountApplied: discount,
        paidNow: finalPaid,
      });
      setCart([]);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      fetchProducts();
    } catch (error: any) {
      setCheckoutError(error.message || "Koi masla aaya, dobara koshish karein.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── RECEIPT / PRINT ─────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!lastInvoice) return;

    const sub = lastInvoice.totalAmount ?? 0;
    const disc = lastInvoice.discountApplied ?? 0;
    const grand = sub - disc;
    const paid = lastInvoice.paidNow ?? 0;
    const bal = grand - paid;

    const itemsHtml = (lastInvoice.items as CartItem[])
      .map((item) => {
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
            .shop-name { font-size: 16px; font-weight: 700; }
            .tagline { font-size: 9.5px; margin-top: 2px; }
            .addr { font-size: 10px; margin-top: 3px; line-height: 1.4; }
            .divider { border-top: 1px dashed #000; margin: 7px 0; }
            .divider-solid { border-top: 1.5px solid #000; margin: 7px 0; }
            .row { display: flex; justify-content: space-between; align-items: baseline; }
            .meta .row { font-size: 10.5px; margin: 2px 0; }
            .col-head { display: flex; justify-content: space-between; font-weight: 700; font-size: 10px; text-transform: uppercase; }
            .item-name { font-weight: 700; font-size: 11.5px; margin-top: 6px; }
            .qty { font-size: 10.5px; color: #222; }
            .amount { font-size: 10.5px; font-weight: 700; }
            .sn { font-size: 9px; color: #333; margin: 1px 0 2px; }
            .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; margin-top: 4px; }
            .sub-row { display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; }
            .thankyou { text-align: center; font-size: 10.5px; margin-top: 12px; font-weight: 600; }
            .footer-box { border: 1px solid #000; border-radius: 4px; padding: 5px 8px; margin-top: 8px; text-align: center; font-size: 9px; line-height: 1.6; }
            .footer-brand { font-size: 10.5px; font-weight: 800; margin: 1px 0; }
            .udhaar { background:#fff3f3; border:1px solid #fca5a5; border-radius:4px; padding:4px 8px; margin-top:4px; }
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
            <div class="row"><span>Date</span><span>${new Date().toLocaleString("ur-PK")}</span></div>
          </div>
          ${customerHtml}
          <div class="divider"></div>
          <div class="col-head"><span>Item</span><span>Amount</span></div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider-solid"></div>
          <div class="sub-row"><span>Sub Total</span><span>Rs. ${Number(sub).toLocaleString()}</span></div>
          ${disc > 0 ? `<div class="sub-row"><span>Discount</span><span>- Rs. ${Number(disc).toLocaleString()}</span></div>` : ""}
          <div class="total-row"><span>GRAND TOTAL</span><span>Rs. ${Number(grand).toLocaleString()}</span></div>
          <div class="divider"></div>
          <div class="sub-row"><span>Paid Amount</span><span>Rs. ${Number(paid).toLocaleString()}</span></div>
          ${bal > 0
            ? `<div class="sub-row udhaar"><span style="font-weight:bold;">Udhaar (Baqi)</span><span style="font-weight:bold;">Rs. ${Number(bal).toLocaleString()}</span></div>`
            : `<div class="sub-row"><span>Balance</span><span>Rs. 0</span></div>`
          }
          <div class="divider"></div>
          <div class="thankyou">Shukriya! Meherbaani farma kar dobara tashreef layen.</div>
          <div class="footer-box">
            <div style="font-size:8.5px;">Powered by</div>
            <div class="footer-brand">${SOFTWARE.name}</div>
            <div style="font-size:8.5px;">${SOFTWARE.phone}</div>
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

  // Enter key → print on receipt screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (isReceiptOpen) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReceiptOpen, lastInvoice]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full gap-6 p-6 bg-slate-50">

      {/* ── LEFT: Product Grid ── */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            ref={searchInputRef}
            placeholder="Scan Barcode ya Serial Number... (Enter dabayein)"
            className={`pl-10 h-12 text-lg shadow-sm border-slate-200 bg-white transition-all ${
              isScanningStatus ? "border-indigo-500 ring-2 ring-indigo-200" : ""
            }`}
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
          {gridProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <Package className="h-10 w-10 opacity-20" />
              <p className="text-sm">Koi product nahi mila</p>
            </div>
          ) : (
            gridProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-95"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-32">
                  <p className="font-semibold text-slate-800 line-clamp-2 text-sm leading-snug">{product.name}</p>
                  <Badge variant={Number(product.opening_stock) > 0 ? "secondary" : "destructive"}>
                    Stock: {product.opening_stock}
                  </Badge>
                  <p className="font-bold text-indigo-600">Rs. {Number(product.salePrice).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart ── */}
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
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.productId} className="p-4 flex flex-col gap-2 hover:bg-slate-50">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{item.name}</p>
                      {/* Loose Pricing: price editable in cart */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-xs font-bold text-indigo-600">Rs.</span>
                        <Input
                          type="number"
                          value={item.salePrice}
                          onChange={(e) => updateCartPrice(item.productId, Number(e.target.value) || 0)}
                          className="h-7 w-24 px-2 py-0 text-sm font-bold text-indigo-600 bg-white border-indigo-200 focus-visible:ring-indigo-400"
                        />
                      </div>
                    </div>

                    {item.serialNumbers.length === 0 ? (
                      <div className="flex items-center gap-1 bg-white border rounded-md shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center font-medium text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Badge className="bg-indigo-100 text-indigo-700 shrink-0">{item.quantity} scanned</Badge>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 shrink-0" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{item.quantity} × Rs. {item.salePrice.toLocaleString()}</span>
                    <span className="text-sm font-bold text-slate-700">
                      Rs. {(item.salePrice * item.quantity).toLocaleString()}
                    </span>
                  </div>

                  {item.serialNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.serialNumbers.map((serial) => (
                        <span
                          key={serial}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600"
                        >
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
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-600">Sub Total:</span>
            <span className="font-bold text-2xl text-slate-900">Rs. {subTotalAmount.toLocaleString()}</span>
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

      {/* ── DIALOG: Sold Serial Info ── */}
      <Dialog open={soldInfoOpen} onOpenChange={setSoldInfoOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Ye Unit Pehle Se Bik Chuki Hai
            </DialogTitle>
          </DialogHeader>
          {soldInfoData && (
            <div className="py-2 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Serial Number</span>
                  <span className="font-mono font-bold">{soldInfoData.serial_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Product</span>
                  <span className="font-semibold">{soldInfoData.products?.name ?? "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <Badge variant="destructive">{soldInfoData.status}</Badge>
                </div>
                {soldInfoData.sale_item?.sale?.invoice_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Invoice</span>
                    <span className="font-mono text-xs">{soldInfoData.sale_item.sale.invoice_number}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 text-center">Yeh unit pehle se kisi sale mein ja chuki hai.</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSoldInfoOpen(false)}>Theek Hai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Checkout ── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Sale Mukammal Karein</DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-4">

            {/* Customer Section */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-xs uppercase tracking-wider">
                <User className="h-3.5 w-3.5" /> Customer Khata
              </h3>
              <div className="space-y-1.5">
                <Label htmlFor="customerName" className="text-xs text-slate-500">Customer Ka Naam</Label>
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
                <Label htmlFor="customerPhone" className="text-xs text-slate-500">
                  Phone Number{" "}
                  <span className="text-rose-500">(Khata banane ke liye zaroori hai)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="customerPhone"
                    placeholder="03XX-XXXXXXX"
                    className="pl-9 bg-white border-indigo-200 focus-visible:ring-indigo-400"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Phone number se duplicate naam rokay jaate hain. Walk-in ke liye khali chhod dein.
                </p>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">

              {/* Sub total row */}
              <div className="flex justify-between items-center text-sm border-b pb-3">
                <span className="text-slate-500">Sub Total</span>
                <span className="font-bold text-base">Rs. {subTotalAmount.toLocaleString()}</span>
              </div>

              {/* Discount + Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Discount (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    max={subTotalAmount}
                    value={discount}
                    onChange={(e) => handleDiscountChange(Number(e.target.value) || 0)}
                    className="bg-slate-50"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Payment Method</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="BANK_TRANSFER">🏦 Bank / EasyPaisa</option>
                    <option value="CARD">💳 Card</option>
                  </select>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center bg-emerald-50 text-emerald-700 px-3 py-2.5 rounded-md font-bold text-lg">
                <span>Grand Total</span>
                <span>Rs. {grandTotal.toLocaleString()}</span>
              </div>

              {/* Paid + Balance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-indigo-700">Amount Paid (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="border-indigo-300 bg-indigo-50 font-bold text-indigo-700"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={`text-xs font-bold ${balanceAmount > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    {balanceAmount > 0 ? "Udhaar (Baqi)" : "Balance"}
                  </Label>
                  <div className={`h-10 flex items-center px-3 border rounded-md font-bold text-base ${
                    balanceAmount > 0
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}>
                    Rs. {Math.max(0, balanceAmount).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Udhaar warning */}
              {balanceAmount > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Rs. {balanceAmount.toLocaleString()} customer ke khate mein udhaar darj ho jaayega.
                </div>
              )}

            </div>

            {checkoutError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
                {checkoutError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 min-w-[140px]"
              onClick={handleCheckout}
              disabled={isSaving || cart.length === 0}
            >
              {isSaving
                ? <><CheckCircle2 className="h-4 w-4 animate-pulse" /> Processing...</>
                : <><Wallet className="h-4 w-4" /> Confirm Sale</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Receipt ── */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-emerald-600 text-xl font-bold">
              <CheckCircle2 className="h-6 w-6" /> Sale Mukammal!
            </DialogTitle>
          </DialogHeader>

          {lastInvoice && (
            <div className="flex flex-col items-center py-2 gap-4">
              <div className="w-full bg-slate-50 rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice #</span>
                  <span className="font-mono font-bold">{lastInvoice.invoice_number || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-semibold">{lastInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grand Total</span>
                  <span className="font-bold text-emerald-700">
                    Rs. {((lastInvoice.totalAmount ?? 0) - (lastInvoice.discountApplied ?? 0)).toLocaleString()}
                  </span>
                </div>
                {(lastInvoice.paidNow ?? 0) < ((lastInvoice.totalAmount ?? 0) - (lastInvoice.discountApplied ?? 0)) && (
                  <div className="flex justify-between text-rose-600 font-bold border-t pt-2">
                    <span>Udhaar Baqi</span>
                    <span>
                      Rs. {(
                        (lastInvoice.totalAmount ?? 0) -
                        (lastInvoice.discountApplied ?? 0) -
                        (lastInvoice.paidNow ?? 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono text-black">Enter</kbd> to print
              </p>

              <Button className="bg-indigo-600 w-full gap-2 hover:bg-indigo-700 h-12" onClick={handlePrint}>
                <Printer className="h-5 w-5" /> Print Thermal Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}