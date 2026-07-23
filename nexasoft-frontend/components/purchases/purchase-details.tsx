import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Pencil, ArrowLeft } from "lucide-react";
import type { Purchase } from "@/types/purchase";
import { formatCurrency, formatDate } from "@/lib/purchase-utils";
import { PaymentStatusBadge } from "./payment-status-badge";

interface PurchaseDetailsProps {
  purchase: Purchase;
  onEdit: () => void;
  onBack: () => void;
}

export function PurchaseDetails({ purchase, onEdit, onBack }: PurchaseDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to purchases
        </Button>
        <Button onClick={onEdit} className="gap-1.5">
          <Pencil className="h-4 w-4" />
          Edit purchase
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">{purchase.purchaseNumber}</CardTitle>
            <PaymentStatusBadge status={purchase.paymentStatus} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Supplier" value={purchase.supplierName} />
          <DetailField label="Invoice number" value={purchase.invoiceNumber} />
          <DetailField label="Purchase date" value={formatDate(purchase.purchaseDate)} />
          <DetailField label="Grand total" value={formatCurrency(purchase.grandTotal)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Products</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((item) => (
                  <TableRow key={item.rowId}>
                    <TableCell>
                      <div className="font-medium">{item.productName}</div>
                      {item.hasSerial && item.serials.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                          {item.serials.map((serial) => (
                            <Badge key={serial} variant="secondary" className="font-mono text-[11px]">
                              {serial}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1 rounded-md bg-muted/50 p-4">
              <span className="text-sm text-muted-foreground">Grand total</span>
              <div className="text-right text-2xl font-semibold tabular-nums">
                {formatCurrency(purchase.grandTotal)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {purchase.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{purchase.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}