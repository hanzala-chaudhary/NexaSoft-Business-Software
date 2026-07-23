"use client";

import { useEffect, useState } from "react";
import { PurchaseList } from "@/components/purchases/purchase-list";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { PurchaseDetails } from "@/components/purchases/purchase-details";
import { mockProducts, mockSuppliers } from "@/data/mock-data";
import { createPurchase, getPurchases, updatePurchase } from "@/services/purchase-service";
import type { Purchase, PurchaseFormValues } from "@/types/purchase";

type View = { mode: "list" } | { mode: "add" } | { mode: "edit"; purchase: Purchase } | { mode: "details"; purchase: Purchase };

/**
 * Top-level page for the Purchase module. 
 */
export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [view, setView] = useState<View>({ mode: "list" });

  useEffect(() => {
    getPurchases().then(setPurchases);
  }, []);

  async function refresh() {
    setPurchases(await getPurchases());
  }

  async function handleCreate(values: PurchaseFormValues) {
    const supplierName = mockSuppliers.find((s) => s.id === values.supplierId)?.name ?? "";
    await createPurchase(values, supplierName);
    await refresh();
    setView({ mode: "list" });
  }

  async function handleUpdate(id: string, values: PurchaseFormValues) {
    const supplierName = mockSuppliers.find((s) => s.id === values.supplierId)?.name ?? "";
    await updatePurchase(id, values, supplierName);
    await refresh();
    setView({ mode: "list" });
  }

  if (view.mode === "add") {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-semibold">Add purchase</h1>
        <PurchaseForm
          products={mockProducts}
          suppliers={mockSuppliers}
          submitLabel="Create purchase"
          onSubmit={handleCreate}
          onCancel={() => setView({ mode: "list" })}
        />
      </div>
    );
  }

  if (view.mode === "edit") {
    const purchase = view.purchase;
    const initialValues: PurchaseFormValues = {
      supplierId: purchase.supplierId,
      purchaseDate: purchase.purchaseDate,
      invoiceNumber: purchase.invoiceNumber,
      notes: purchase.notes ?? "",
      paymentStatus: purchase.paymentStatus,
      items: purchase.items,
    };
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-semibold">Edit purchase — {purchase.purchaseNumber}</h1>
        <PurchaseForm
          products={mockProducts}
          suppliers={mockSuppliers}
          initialValues={initialValues}
          submitLabel="Save changes"
          onSubmit={(values) => handleUpdate(purchase.id, values)}
          onCancel={() => setView({ mode: "details", purchase })}
        />
      </div>
    );
  }

  if (view.mode === "details") {
    return (
      <div className="p-6">
        <PurchaseDetails
          purchase={view.purchase}
          onEdit={() => setView({ mode: "edit", purchase: view.purchase })}
          onBack={() => setView({ mode: "list" })}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Purchases</h1>
      <PurchaseList
        purchases={purchases}
        onView={(purchase) => setView({ mode: "details", purchase })}
        onEdit={(purchase) => setView({ mode: "edit", purchase })}
        onAddNew={() => setView({ mode: "add" })}
      />
    </div>
  );
}