import { useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import type { Product, PurchaseFormValues, PurchaseItem, Supplier } from "@/types/purchase";
import {
  calculateGrandTotal,
  calculateItemTotal,
  createEmptyItem,
  formatCurrency,
  validateSerials,
} from "@/lib/purchase-utils";
import { PurchaseItemRow } from "./purchase-item-row";

interface PurchaseFormProps {
  products: Product[];
  suppliers: Supplier[];
  initialValues?: PurchaseFormValues;
  submitLabel?: string;
  onSubmit: (values: PurchaseFormValues) => void;
  onCancel: () => void;
}

function toFormValues(initial?: PurchaseFormValues): PurchaseFormValues {
  return (
    initial ?? {
      supplierId: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      invoiceNumber: "",
      notes: "",
      paymentStatus: "Pending",
      items: [createEmptyItem()],
    }
  );
}

export function PurchaseForm({
  products,
  suppliers,
  initialValues,
  submitLabel = "Save purchase",
  onSubmit,
  onCancel,
}: PurchaseFormProps) {
  const [values, setValues] = useState<PurchaseFormValues>(() => toFormValues(initialValues));
  const [formError, setFormError] = useState<string | null>(null);

  const grandTotal = useMemo(() => calculateGrandTotal(values.items), [values.items]);

  function updateField<K extends keyof PurchaseFormValues>(key: K, value: PurchaseFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(rowId: string, patch: Partial<PurchaseItem>) {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.rowId !== rowId) return item;
        const merged = { ...item, ...patch };
        return { ...merged, total: calculateItemTotal(merged.quantity, merged.costPrice) };
      }),
    }));
  }

  function addItem() {
    setValues((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  }

  function removeItem(rowId: string) {
    setValues((prev) => ({ ...prev, items: prev.items.filter((item) => item.rowId !== rowId) }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!values.supplierId) {
      setFormError("Please select a supplier.");
      return;
    }
    if (!values.invoiceNumber.trim()) {
      setFormError("Please enter an invoice number.");
      return;
    }
    const validItems = values.items.filter((item) => item.productId);
    if (validItems.length === 0) {
      setFormError("Add at least one product to this purchase.");
      return;
    }
    if (validItems.some((item) => item.quantity <= 0)) {
      setFormError("Every product row needs a quantity greater than zero.");
      return;
    }

    const serialError = validateSerials(validItems);
    if (serialError) {
      setFormError(serialError);
      return;
    }

    onSubmit({ ...values, items: validItems });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="supplier">Supplier</Label>
            <Select value={values.supplierId || undefined} onValueChange={(v) => updateField("supplierId", v)}>
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchaseDate">Purchase date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={values.purchaseDate}
              onChange={(e) => updateField("purchaseDate", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoiceNumber">Invoice number</Label>
            <Input
              id="invoiceNumber"
              value={values.invoiceNumber}
              onChange={(e) => updateField("invoiceNumber", e.target.value)}
              placeholder="e.g. INV-1023"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentStatus">Payment status</Label>
            <Select
              value={values.paymentStatus}
              onValueChange={(v) => updateField("paymentStatus", v as PurchaseFormValues["paymentStatus"])}
            >
              <SelectTrigger id="paymentStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Optional notes about this purchase"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Products</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-32">Cost price</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {values.items.map((item) => (
                  <PurchaseItemRow
                    key={item.rowId}
                    item={item}
                    products={products}
                    onChange={updateItem}
                    onRemove={removeItem}
                    canRemove={values.items.length > 1}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1 rounded-md bg-muted/50 p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Grand total</span>
              </div>
              <div className="text-right text-2xl font-semibold tabular-nums">
                {formatCurrency(grandTotal)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {formError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}