"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Barcode, Trash2, Plus, Minus, CreditCard, ShoppingCart } from "lucide-react";

// ─── Dummy Data (Client Demo ke liye) ────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
  stock: number;
}

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Wireless Mechanical Keyboard", price: 85.00, barcode: "1111", stock: 12 },
  { id: "2", name: "Optical Mouse", price: 25.00, barcode: "2222", stock: 50 },
  { id: "3", name: "1TB NVMe SSD", price: 120.00, barcode: "3333", stock: 8 },
  { id: "4", name: "HDMI Cable 2m", price: 15.00, barcode: "4444", stock: 100 },
  { id: "5", name: "USB-C Hub", price: 35.00, barcode: "5555", stock: 25 },
  { id: "6", name: "24-inch IPS Monitor", price: 150.00, barcode: "6666", stock: 5 },
  { id: "7", name: "Gaming Headset", price: 65.00, barcode: "7777", stock: 15 },
  { id: "8", name: "Webcam 1080p", price: 45.00, barcode: "8888", stock: 20 },
];

interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Main POS Component ──────────────────────────────────────────────────────

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  // Search logic
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
    );
  }, [searchQuery]);

  // Cart totals calculation
  const subTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subTotal * 0.05; // 5% dummy tax
  const grandTotal = subTotal + tax;

  // Actions
  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const product = MOCK_PRODUCTS.find((p) => p.barcode === barcodeInput.trim());
    if (product) {
      addToCart(product);
      setBarcodeInput(""); // Scan ke baad input clear
    } else {
      alert("Product not found! (Try barcode 1111, 2222, etc.)");
    }
  }

  function handleCheckout() {
    if (cart.length === 0) return;
    alert(`Checkout Successful! Total Amount: $${grandTotal.toFixed(2)}`);
    setCart([]); // Cart empty on checkout
  }

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6 p-6">
      
      {/* ─── Left Side: Products & Scanning ─── */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
        </div>

        {/* Search & Scanner Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products by name..."
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 sm:max-w-[300px]">
            <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Scan Barcode (Press Enter)"
              className="pl-9 border-indigo-200 focus-visible:ring-indigo-500 bg-white"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
            <button type="submit" className="hidden">Submit</button>
          </form>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 rounded-xl border bg-white/50 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <ShoppingCart className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px]">{product.name}</h3>
                  <div className="flex items-center justify-between w-full mt-2">
                    <span className="font-bold text-indigo-600">${product.price.toFixed(2)}</span>
                    <Badge variant="secondary" className="text-[10px]">Stock: {product.stock}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No products found matching your search.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── Right Side: Cart & Checkout ─── */}
      <div className="w-full lg:w-[400px] flex shrink-0 flex-col">
        <Card className="flex h-full flex-col shadow-sm border-slate-200">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center justify-between text-lg">
              Current Order
              <Badge variant="default" className="bg-indigo-500 hover:bg-indigo-600">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full px-4">
              {cart.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-muted-foreground gap-2">
                  <ShoppingCart className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 py-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between gap-2 border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">${item.product.price.toFixed(2)}</p>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-md border border-slate-200 bg-white">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none rounded-l-md" onClick={() => updateQuantity(item.product.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none rounded-r-md" onClick={() => updateQuantity(item.product.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => removeFromCart(item.product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Checkout Section */}
          <div className="border-t bg-slate-50/50 p-4 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>${subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax (5%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                <span>Total</span>
                <span className="text-indigo-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 gap-2" 
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              <CreditCard className="h-5 w-5" />
              Process Payment
            </Button>
          </div>
        </Card>
      </div>
      
    </div>
  );
}