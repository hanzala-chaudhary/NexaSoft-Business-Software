import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SerialHistoryEvent, SerializedProduct } from "@/types/serial";
import { formatCurrency, formatDate, isWarrantyActive } from "@/lib/serial-utils";
import { SerialStatusBadge } from "./serial-status-badge";
import { SerialTimeline } from "./serial-timeline";
import { ShieldCheck, ShieldOff } from "lucide-react";

interface FieldProps {
  label: string;
  value: React.ReactNode;
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value ?? "—"}</p>
    </div>
  );
}

export function SerialDetailCard({
  item,
  history,
}: {
  item: SerializedProduct;
  history: SerialHistoryEvent[];
}) {
  const warrantyActive = isWarrantyActive(item);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{item.productName}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.brand} · {item.category}
            </p>
          </div>
          <SerialStatusBadge status={item.status} className="text-sm" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Serial Number" value={item.serialNumber} />
            <Field label="Barcode" value={item.barcode} />
            <Field label="SKU" value={item.sku} />
            <Field label="Purchase Price" value={formatCurrency(item.purchasePrice)} />
            <Field label="Sale Price" value={formatCurrency(item.salePrice)} />
            <Field label="Supplier" value={item.supplierName} />
            <Field label="Customer" value={item.customerName ?? "Not sold"} />
            <Field label="Purchase Date" value={formatDate(item.purchaseDate)} />
            <Field label="Sale Date" value={item.saleDate ? formatDate(item.saleDate) : "—"} />
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Warranty</p>
              <p
                className={`mt-0.5 flex items-center gap-1.5 text-sm font-medium ${
                  warrantyActive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {warrantyActive ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                {warrantyActive ? `Active until ${formatDate(item.warrantyEndDate)}` : "Expired"}
              </p>
            </div>
            <Field label="Manufacturer Serial" value={item.manufacturerSerial} />
            <Field label="Internal Tracking No." value={item.internalTrackingNo} />
          </div>

          {item.notes && (
            <>
              <Separator className="my-4" />
              <Field label="Notes" value={item.notes} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <SerialTimeline events={history} />
        </CardContent>
      </Card>
    </div>
  );
}