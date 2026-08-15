"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart, Printer, Trash2, Plus, Minus, Search,
  CheckCircle2, X, AlertCircle, User, Phone, Wallet, Package, Zap, Keyboard, ChevronRight, Loader2
} from "lucide-react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexasoft-business-software-production.up.railway.app/api";

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

  // ── Checkout State ──
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

  // ── On-the-Fly Custom Item State ──
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ name: "", price: "", cost: "0" });
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  // ── Cloud Notifications ──
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" | "info" }>({ show: false, msg: "", type: "info" });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "info" }), 3500);
  };

  // ─── KEYBOARD SHORTCUTS (PRO FEATURE) ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering if user is typing in a dialog input (unless it's Enter for Receipt)
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === "input" || activeTag === "textarea";

      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutOpen && !isReceiptOpen && !isCustomItemOpen) {
          openCheckout();
        }
      }
      if (e.key === "F8") {
        e.preventDefault();
        if (!isCheckoutOpen && !isReceiptOpen) {
          setIsCustomItemOpen(true);
        }
      }
      if (e.key === "Enter" && isReceiptOpen) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isCheckoutOpen, isReceiptOpen, isCustomItemOpen, lastInvoice]);

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
      showToast("Cloud connection error. Data may not be synced.", "error");
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
  const addToCart = (product: any, isSilent = false) => {
    const existing = cart.find((item) => item.productId === product.id);

    if (existing && existing.serialNumbers.length > 0) {
      showToast(`"${product.name}" is already tracked via serial number. Scan next serial to increase qty.`, "info");
      return;
    }

    const currentQty = existing ? existing.quantity : 0;
    // Bypass stock check for dynamic/custom items (which might have 0 opening stock but can still be sold)
    if (product.opening_stock !== undefined && currentQty + 1 > Number(product.opening_stock) && !product.is_custom_allowed) {
      showToast(`Only ${product.opening_stock} units of "${product.name}" available in physical stock!`, "error");
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
    
    if (!isSilent) showToast(`Added ${product.name} to bill`, "success");
  };

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

  // ─── CUSTOM ON-THE-FLY ITEM LOGIC ─────────────────────────────────────────
  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItem.name || !customItem.price) {
      showToast("Please provide both Name and Price for the custom item.", "error");
      return;
    }

    setIsSavingCustom(true);
    try {
      // Push to backend to maintain referential integrity in sales records
      const payload = {
        name: `[Custom] ${customItem.name.trim()}`,
        salePrice: Number(customItem.price),
        purchasePrice: Number(customItem.cost) || 0,
        openingStock: 9999, // infinite stock for custom items
        isSerialized: false,
        masterBarcode: `CUST-${Date.now().toString().slice(-6)}`
      };

      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const newProd = await res.json();
      if (!res.ok) throw new Error(newProd.message || "Failed to create quick item");

      // Flag to bypass strict stock checking locally
      newProd.is_custom_allowed = true;

      addToCart(newProd, true);
      setProducts([...products, newProd]); // update local cache
      
      setIsCustomItemOpen(false);
      setCustomItem({ name: "", price: "", cost: "0" });
      showToast("Custom Item added to bill successfully!", "success");
      
      // Refocus search bar automatically
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSavingCustom(false);
    }
  };

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
          showToast(`Hardware Serial [${data.serial_number}] Verified`, "success");
        } else {
          setSoldInfoData(data);
          setSoldInfoOpen(true);
        }
        return;
      }

      const matched = products.find((p) => p.master_barcode === code || p.sku === code);
      if (matched) {
         addToCart(matched, true);
         showToast(`Barcode Scanned: ${matched.name}`, "success");
      } else {
         showToast(`No product found for barcode: ${code}`, "error");
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
      alert(`"${serialData.products?.name}" is already in cart as non-serialized. Please clear it first to scan specific hardware.`);
      return;
    }
    if (existing && existing.serialNumbers.includes(serialData.serial_number)) {
      showToast("This serial number is already scanned in the current bill!", "info");
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
  const openCheckout = () => {
    setCheckoutError("");
    setCustomerInfo({ name: "Walk-in Customer", phone: "" });
    setDiscount(0);
    setPaidAmount(subTotalAmount);
    setPaymentMethod("CASH");
    setIsCheckoutOpen(true);
  };

  const handleDiscountChange = (val: number) => {
    const d = val >= 0 ? val : 0;
    setDiscount(d);
    setPaidAmount(subTotalAmount - d); 
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isSaving) return;
    setCheckoutError("");

    const trimmedName = customerInfo.name.trim();
    const trimmedPhone = customerInfo.phone.trim();

    try {
      setIsSaving(true);

      let customerId: string | undefined = undefined;
      // Fixed Bug: Phone validation removed for flexible account creation
      if (trimmedName && trimmedName !== "Walk-in Customer") {
        const custRes = await fetch(`${API_URL}/customers/find-or-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, phone: trimmedPhone || undefined }),
        });
        if (custRes.ok) {
          const custData = await custRes.json();
          customerId = custData.id;
        } else {
          throw new Error("Failed to secure customer record.");
        }
      }

      const finalPaid = Number(paidAmount) || 0;
      const gTotal = subTotalAmount - discount;
      let paymentStatus = "PAID";
      if (finalPaid <= 0) paymentStatus = "PENDING";
      else if (finalPaid < gTotal) paymentStatus = "PARTIAL";

      const payload = {
        totalAmount: subTotalAmount,
        discount: discount,
        paidAmount: finalPaid,
        paymentMethod: paymentMethod,
        paymentStatus,
        customerId,
        // Fixed Bug: Sending productName explicitly to backend to avoid validation errors
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.name,
          name: item.name,
          quantity: item.quantity,
          salePrice: item.salePrice,
          serialNumbers: item.serialNumbers,
        })),
      };

      const res = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Checkout transaction failed");

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
      showToast("Transaction Successful!", "success");
    } catch (error: any) {
      setCheckoutError(error.message || "Unknown checkout error occurred.");
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
    const invoiceNo = lastInvoice.invoice_number || "INV-XXXX";

    // Advanced dynamic Barcode URL for invoice tracking
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(invoiceNo)}&scale=2&height=10`;

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
          <title>Receipt ${invoiceNo}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 10px 12px 16px; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; width: 80mm; }
            .center { text-align: center; }
            .shop-name { font-size: 16px; font-weight: 900; letter-spacing: 0.5px;}
            .tagline { font-size: 9px; margin-top: 2px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; display: inline-block;}
            .addr { font-size: 10px; margin-top: 4px; line-height: 1.4; }
            .divider { border-top: 1px dashed #000; margin: 7px 0; }
            .divider-solid { border-top: 1.5px solid #000; margin: 7px 0; }
            .row { display: flex; justify-content: space-between; align-items: baseline; }
            .meta { background: #f8f8f8; padding: 4px; border: 1px dashed #ccc; margin-top: 6px; }
            .meta .row { font-size: 10.5px; margin: 2px 0; font-weight: bold;}
            .col-head { display: flex; justify-content: space-between; font-weight: 800; font-size: 10px; text-transform: uppercase; background: #000; color: #fff; padding: 3px 5px;}
            .item-name { font-weight: 800; font-size: 11.5px; margin-top: 6px; }
            .qty { font-size: 10.5px; color: #222; }
            .amount { font-size: 11px; font-weight: 800; }
            .sn { font-size: 9px; color: #444; margin: 1px 0 2px; font-style: italic;}
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-top: 5px; padding: 4px 0; border-top: 2px solid #000; border-bottom: 2px double #000;}
            .sub-row { display: flex; justify-content: space-between; font-size: 11px; margin-top: 3px; font-weight: 600;}
            .thankyou { text-align: center; font-size: 10px; margin-top: 12px; font-weight: 800; padding: 4px; border: 1px dashed #000;}
            .barcode-container { text-align: center; margin-top: 10px; }
            .barcode-container img { max-width: 90%; height: 12mm; }
            .footer-box { padding: 5px 8px; margin-top: 10px; text-align: center; font-size: 9px; line-height: 1.6; }
            .footer-brand { font-size: 11px; font-weight: 900; margin: 1px 0; letter-spacing: 1px;}
            .udhaar { background:#000; color: #fff; padding:4px 8px; margin-top:4px; border-radius: 2px;}
          </style>
        </head>
        <body>
          <div class="center">
            <div class="shop-name">${SHOP.name}</div>
            <div class="tagline">${SHOP.tagline}</div>
            <div class="addr">${SHOP.addressLine1}<br/>${SHOP.addressLine2}</div>
            <div class="addr">Ph: ${SHOP.phones}</div>
          </div>
          <div class="meta">
            <div class="row"><span>Invoice #</span><span>${invoiceNo}</span></div>
            <div class="row"><span>Date</span><span>${new Date().toLocaleString("ur-PK")}</span></div>
          </div>
          ${customerHtml}
          <div style="margin-top: 8px;"></div>
          <div class="col-head"><span>Item Details</span><span>Amount</span></div>
          ${itemsHtml}
          <div class="divider-solid"></div>
          <div class="sub-row"><span>Sub Total</span><span>Rs. ${Number(sub).toLocaleString()}</span></div>
          ${disc > 0 ? `<div class="sub-row"><span>Discount</span><span>- Rs. ${Number(disc).toLocaleString()}</span></div>` : ""}
          <div class="total-row"><span>GRAND TOTAL</span><span>Rs. ${Number(grand).toLocaleString()}</span></div>
          <div style="margin-top: 6px;"></div>
          <div class="sub-row"><span>Amount Paid</span><span>Rs. ${Number(paid).toLocaleString()}</span></div>
          ${bal > 0
            ? `<div class="sub-row udhaar"><span style="font-weight:bold;">UDHAAR (BALANCE)</span><span style="font-weight:bold;">Rs. ${Number(bal).toLocaleString()}</span></div>`
            : `<div class="sub-row"><span>Change/Balance</span><span>Rs. 0</span></div>`
          }
          
          <div class="thankyou">Shukriya! Meherbaani farma kar dobara tashreef layen.</div>
          
          <div class="barcode-container">
             <img src="${barcodeUrl}" alt="Invoice Barcode" />
          </div>

          <div class="footer-box">
            <div style="font-size:8.5px;">Technology Partner</div>
            <div class="footer-brand">${SOFTWARE.name}</div>
            <div style="font-size:8.5px;">Support: ${SOFTWARE.phone}</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      showToast("Popup blocked. Please allow popups for receipt printing.", "error");
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

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full gap-6 p-6 bg-slate-100 overflow-hidden relative">

      {/* ── Global Cloud Notification Toast ── */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${toast.show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
        <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-xl border ${toast.type === 'error' ? 'bg-rose-900 border-rose-500 text-white' : toast.type === 'info' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-emerald-900 border-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : toast.type === 'info' ? <Zap className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <p className="font-bold text-sm tracking-wide">{toast.msg}</p>
        </div>
      </div>

      {/* ── LEFT: Product Grid & Search ── */}
      <div className="flex-1 flex flex-col gap-4 relative">
        
        {/* Dynamic Action Bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Scan Barcode or Type Product Name..."
              className={`pl-12 h-14 text-lg font-semibold shadow-inner border-slate-300 bg-slate-50 transition-all focus-visible:ring-indigo-500 ${
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
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" /> Scanning...
              </div>
            )}
          </div>

          <Button 
            onClick={() => setIsCustomItemOpen(true)} 
            className="h-14 px-6 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold shadow-lg rounded-xl transition-transform hover:scale-105"
          >
            <Zap className="h-5 w-5 fill-white" />
            <span className="flex flex-col items-start leading-none">
               <span>Quick Item</span>
               <span className="text-[10px] font-medium opacity-80 mt-1">[F8] to open</span>
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-6 custom-scrollbar">
          {gridProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-400 gap-3 bg-white rounded-xl border border-dashed border-slate-300">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-lg font-bold text-slate-500">No inventory match found.</p>
              <Button variant="outline" size="sm" onClick={() => setIsCustomItemOpen(true)} className="mt-2 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100">
                <Zap className="h-4 w-4 mr-1.5" /> Sell as Custom Item
              </Button>
            </div>
          ) : (
            gridProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all active:scale-95 group overflow-hidden bg-white"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3 h-36 relative">
                  <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 w-full">
                    <p className="font-extrabold text-slate-800 line-clamp-2 text-sm leading-tight">{product.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Badge variant="outline" className={`font-bold border-2 ${Number(product.opening_stock) > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {product.opening_stock} IN STOCK
                      </Badge>
                    </div>
                    <p className="font-black text-indigo-700 text-lg mt-2">Rs. {Number(product.salePrice).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Cloud-Level Status Bar */}
        <div className="mt-auto bg-slate-800 text-slate-300 text-[11px] font-bold py-2 px-4 rounded-lg flex items-center justify-between uppercase tracking-wider shadow-inner">
           <div className="flex gap-4">
              <span className="flex items-center gap-1.5"><Keyboard className="h-3.5 w-3.5"/> F2 : Pay & Checkout</span>
              <span className="flex items-center gap-1.5"><Keyboard className="h-3.5 w-3.5"/> F8 : Quick Item</span>
           </div>
           <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5"/> Cloud Sync Active</span>
        </div>
      </div>

      {/* ── RIGHT: Cart Terminal ── */}
      <Card className="w-[420px] flex flex-col shadow-2xl border-slate-300 h-[calc(100vh-3rem)] overflow-hidden bg-white">
        <CardHeader className="border-b bg-slate-900 text-white p-5">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-emerald-400" />
              <span className="font-black tracking-wide">POS TERMINAL</span>
            </div>
            <Badge className="bg-white/20 text-white hover:bg-white/30 font-bold border-none px-3">
              {cart.length} Items Selected
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 p-8 text-center">
              <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center shadow-inner">
                <ShoppingCart className="h-10 w-10 text-slate-400 opacity-50" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-600">Cart is empty</p>
                <p className="text-xs mt-1">Scan a barcode or click a product to begin billing.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {cart.map((item) => (
                <div key={item.productId} className="p-4 flex flex-col gap-3 bg-white hover:bg-indigo-50/30 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 text-[13px] leading-tight line-clamp-2">{item.name}</p>
                      
                      {/* Interactive Price Editor */}
                      <div className="flex items-center gap-1.5 mt-2 bg-slate-50 w-fit px-2 py-1 rounded border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Rate:</span>
                        <Input
                          type="number"
                          value={item.salePrice}
                          onChange={(e) => updateCartPrice(item.productId, Number(e.target.value) || 0)}
                          className="h-6 w-20 px-1 py-0 text-sm font-bold text-indigo-700 bg-transparent border-none focus-visible:ring-0 shadow-none"
                        />
                      </div>
                    </div>

                    {item.serialNumbers.length === 0 ? (
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0 shadow-inner">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm hover:text-rose-600 transition-all" onClick={() => updateCartQuantity(item.productId, -1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center font-black text-slate-800 text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-white hover:shadow-sm hover:text-emerald-600 transition-all" onClick={() => updateCartQuantity(item.productId, 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-bold shrink-0 shadow-sm">{item.quantity} Units</Badge>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full shrink-0 transition-colors" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Line Total</span>
                    <span className="text-[15px] font-black text-slate-900">
                      Rs. {(item.salePrice * item.quantity).toLocaleString()}
                    </span>
                  </div>

                  {item.serialNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1 bg-slate-100 p-2 rounded-md shadow-inner border border-slate-200">
                      {item.serialNumbers.map((serial) => (
                        <span
                          key={serial}
                          className="inline-flex items-center gap-1.5 rounded bg-white border border-slate-300 shadow-sm px-2 py-1 text-[10px] font-mono font-bold text-slate-700"
                        >
                          {serial}
                          <button onClick={() => removeSerialFromCart(item.productId, serial)} className="hover:text-rose-600 hover:bg-rose-50 rounded-full p-0.5 transition-colors">
                            <X className="h-3 w-3" />
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

        <div className="bg-white border-t-2 border-slate-200 p-5 shadow-[0_-10px_15px_-3px_rgb(0,0,0,0.05)] z-10">
          <div className="flex justify-between items-center mb-4">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider text-sm">Sub Total Payable</span>
            <span className="font-black text-3xl text-indigo-700 tracking-tight">Rs. {subTotalAmount.toLocaleString()}</span>
          </div>
          <Button
            className="w-full h-16 text-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 gap-3 rounded-xl"
            disabled={cart.length === 0}
            onClick={openCheckout}
          >
            <Wallet className="h-6 w-6" /> PAY & CHECKOUT <span className="text-[11px] font-bold bg-emerald-800 px-2 py-1 rounded-md opacity-80">[F2]</span>
          </Button>
        </div>
      </Card>

      {/* ── DIALOG: Quick Custom Item ── */}
      <Dialog open={isCustomItemOpen} onOpenChange={setIsCustomItemOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-slate-50">
          <form onSubmit={handleAddCustomItem}>
             <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
                <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                   <Zap className="h-6 w-6 fill-white" /> Quick Custom Sale
                </DialogTitle>
                <DialogDescription className="text-amber-100 font-medium text-xs mt-1">
                   Instantly sell an item not in your physical catalog.
                </DialogDescription>
             </div>
             <div className="p-6 space-y-4">
                <div className="space-y-2">
                   <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Item Name / Description <span className="text-rose-500">*</span></Label>
                   <Input required autoFocus className="h-12 border-slate-300 font-bold bg-white text-base shadow-sm focus-visible:ring-amber-500" placeholder="e.g. Extra Delivery Charges, Used Mouse" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Sale Price <span className="text-rose-500">*</span></Label>
                      <Input required type="number" min="0" className="h-12 border-slate-300 font-black text-indigo-700 bg-indigo-50 shadow-sm focus-visible:ring-amber-500" placeholder="0" value={customItem.price} onChange={e => setCustomItem({...customItem, price: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider flex justify-between">Cost Price <span className="text-slate-400 font-normal lowercase">(Optional)</span></Label>
                      <Input type="number" min="0" className="h-12 border-slate-300 font-bold bg-slate-100 shadow-inner focus-visible:ring-amber-500" placeholder="0" value={customItem.cost} onChange={e => setCustomItem({...customItem, cost: e.target.value})} />
                   </div>
                </div>
                <p className="text-[10px] text-slate-500 text-center font-medium bg-slate-200/50 p-2 rounded-lg mt-2">
                  This item will bypass physical stock checks and instantly sync to the cloud database for future reporting.
                </p>
             </div>
             <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
               <Button type="button" variant="outline" className="font-bold border-slate-300 hover:bg-slate-100" onClick={() => setIsCustomItemOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={isSavingCustom} className="bg-amber-600 hover:bg-amber-700 font-bold text-white shadow-md">
                 {isSavingCustom ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                 Add to Bill
               </Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Sold Serial Info ── */}
      <Dialog open={soldInfoOpen} onOpenChange={setSoldInfoOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Unit Already Sold / Dispatched
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
                    <span className="text-slate-500">Linked Invoice</span>
                    <span className="font-mono font-bold text-indigo-600">{soldInfoData.sale_item.sale.invoice_number}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 text-center">Cannot add to cart. This specific hardware serial is no longer in physical inventory.</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSoldInfoOpen(false)} className="w-full font-bold">Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Checkout ── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-slate-50">
          <div className="bg-emerald-600 px-6 py-4 text-white">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
               <Wallet className="h-6 w-6" /> Finalize Transaction
            </DialogTitle>
          </div>

          <div className="p-6 space-y-5">
            {/* Customer Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5"><User className="h-20 w-20"/></div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b pb-2">
                 Customer Ledger (Khata)
              </h3>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                   <Label htmlFor="customerName" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Name</Label>
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                     <Input
                       id="customerName"
                       placeholder="Walk-in Customer"
                       className="pl-9 h-11 bg-slate-50 font-semibold focus-visible:ring-emerald-500"
                       value={customerInfo.name}
                       onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                     />
                   </div>
                 </div>
                 <div className="space-y-1.5 col-span-2 sm:col-span-1">
                   <Label htmlFor="customerPhone" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                     Phone Number <span className="text-slate-400 normal-case font-normal">(Optional)</span>
                   </Label>
                   <div className="relative">
                     <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                     <Input
                       id="customerPhone"
                       placeholder="03XX-XXXXXXX"
                       className="pl-9 h-11 bg-slate-50 font-bold focus-visible:ring-emerald-500"
                       value={customerInfo.phone}
                       onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                     />
                   </div>
                 </div>
                 <p className="text-[10px] font-medium text-slate-400 col-span-2 leading-tight">
                   * Enter phone to record exact ledger. Leave empty for quick walk-in sales.
                 </p>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center text-sm border-b pb-3">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Sub Total</span>
                <span className="font-black text-lg text-slate-800">Rs. {subTotalAmount.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Discount (PKR)</Label>
                  <Input
                    type="number" min="0" max={subTotalAmount}
                    value={discount}
                    onChange={(e) => handleDiscountChange(Number(e.target.value) || 0)}
                    className="h-11 bg-slate-50 font-bold text-rose-600 focus-visible:ring-emerald-500"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Mode</Label>
                  <select
                    className="flex h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 font-bold text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">💵 CASH TILL</option>
                    <option value="BANK_TRANSFER">🏦 BANK / ONLINE</option>
                    <option value="CARD">💳 POS CARD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-inner">
                <span className="font-extrabold uppercase tracking-wide text-sm">Grand Total</span>
                <span className="font-black text-2xl">Rs. {grandTotal.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">Amount Received</Label>
                  <Input
                    type="number" min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="h-12 border-indigo-300 bg-indigo-50 font-black text-xl text-indigo-700 shadow-inner focus-visible:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={`text-[11px] font-extrabold uppercase tracking-wider ${balanceAmount > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    {balanceAmount > 0 ? "LEDGER DEBT (UDHAAR)" : "CHANGE DUE"}
                  </Label>
                  <div className={`h-12 flex items-center px-4 border rounded-md font-black text-xl shadow-inner ${
                    balanceAmount > 0
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-emerald-300 bg-emerald-50 text-emerald-700"
                  }`}>
                    Rs. {Math.max(0, balanceAmount).toLocaleString()}
                  </div>
                </div>
              </div>

              {balanceAmount > 0 && (
                <div className="flex items-start gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  Rs. {balanceAmount.toLocaleString()} will be recorded as pending debt in the customer ledger.
                </div>
              )}
            </div>

            {checkoutError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 shadow-sm">
                <X className="h-4 w-4 bg-rose-200 rounded-full p-0.5" /> {checkoutError}
              </div>
            )}
          </div>

          <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" className="font-bold h-12 px-6" onClick={() => setIsCheckoutOpen(false)} disabled={isSaving}>
              Abort
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8 font-black shadow-lg hover:shadow-xl transition-all gap-2 text-base"
              onClick={handleCheckout}
              disabled={isSaving || cart.length === 0}
            >
              {isSaving
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Verifying Cloud...</>
                : <><Wallet className="h-5 w-5" /> CONFIRM & GENERATE BILL</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Receipt ── */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-slate-50">
          <div className="bg-emerald-50 border-b border-emerald-100 p-6 flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
               <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <DialogTitle className="text-emerald-800 text-2xl font-black uppercase tracking-wide">
              Transaction Secured
            </DialogTitle>
          </div>

          {lastInvoice && (
            <div className="px-6 py-6 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 text-sm">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Invoice Tracking ID</span>
                  <span className="font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{lastInvoice.invoice_number || "-"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 text-sm">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Billed To</span>
                  <span className="font-bold text-slate-800">{lastInvoice.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Final Grand Total</span>
                  <span className="font-black text-emerald-700 text-xl">
                    Rs. {((lastInvoice.totalAmount ?? 0) - (lastInvoice.discountApplied ?? 0)).toLocaleString()}
                  </span>
                </div>
                {(lastInvoice.paidNow ?? 0) < ((lastInvoice.totalAmount ?? 0) - (lastInvoice.discountApplied ?? 0)) && (
                  <div className="flex justify-between items-center bg-rose-50 border border-rose-100 p-2 rounded-lg mt-2">
                    <span className="text-rose-600 font-extrabold uppercase tracking-wider text-[11px]">Udhaar Ledger</span>
                    <span className="font-black text-rose-700">
                      Rs. {(
                        (lastInvoice.totalAmount ?? 0) -
                        (lastInvoice.discountApplied ?? 0) -
                        (lastInvoice.paidNow ?? 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <Button className="bg-slate-900 w-full hover:bg-slate-800 h-14 text-lg font-black shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 gap-3 rounded-xl" onClick={handlePrint}>
                <Printer className="h-6 w-6" /> PRINT THERMAL RECEIPT
                <span className="text-[10px] font-bold bg-slate-700 px-2 py-1 rounded-md ml-2 border border-slate-600">[ENTER]</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}