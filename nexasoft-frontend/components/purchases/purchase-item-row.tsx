import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Fingerprint } from "lucide-react";
import type { Product, PurchaseItem } from "@/types/purchase";
import { formatCurrency } from "@/lib/purchase-utils";
import { SerialNumberDialog } from "./serial-number-dialog";

interface PurchaseItemRowProps {
  item: PurchaseItem;
  products: Product[];
  onChange: (rowId: string, patch: Partial<PurchaseItem>) => void;
  onRemove: (rowId: string) => void;
  canRemove: boolean;
}

export function PurchaseItemRow({
  item,
  products,
  onChange,
  onRemove,
  canRemove,
}: PurchaseItemRowProps) {
  const [serialDialogOpen, setSerialDialogOpen] = useState(false);

  function handleProductSelect(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    onChange(item.rowId, {
      productId: product.id,
      productName: product.name,
      hasSerial: product.hasSerial,
      // Reset serials when the product changes since counts may differ.
      serials: [],
    });
  }

  function handleQuantityChange(value: string) {
    const quantity = Math.max(0, Number(value) || 0);
    onChange(item.rowId, {
      quantity,
      // Trim serials if quantity shrinks; keep as-is otherwise until re-entered.
      serials: item.serials.slice(0, quantity),
    });
  }

  function handleCostPriceChange(value: string) {
    const costPrice = Math.max(0, Number(value) || 0);
    onChange(item.rowId, { costPrice });
  }

  const serialsComplete = item.serials.length === item.quantity && item.quantity > 0;

  return (
    <TableRow>
      <TableCell className="min-w-[220px]">
        <Select value={item.productId || undefined} onValueChange={handleProductSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {item.hasSerial && (
          <div className="mt-2">
            <Button
              type="button"
              variant={serialsComplete ? "secondary" : "outline"}
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setSerialDialogOpen(true)}
              disabled={!item.productId || item.quantity < 1}
            >
              <Fingerprint className="h-3.5 w-3.5" />
              Serials
              <Badge
                variant={serialsComplete ? "default" : "destructive"}
                className="ml-1 h-4 px-1.5 text-[10px]"
              >
                {item.serials.length}/{item.quantity}
              </Badge>
            </Button>
          </div>
        )}
      </TableCell>

      <TableCell className="w-24">
        <Input
          type="number"
          min={0}
          value={item.quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
        />
      </TableCell>

      <TableCell className="w-32">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={item.costPrice}
          onChange={(e) => handleCostPriceChange(e.target.value)}
        />
      </TableCell>

      <TableCell className="w-28 text-right font-medium tabular-nums">
        {formatCurrency(item.total)}
      </TableCell>

      <TableCell className="w-12">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.rowId)}
          disabled={!canRemove}
          aria-label="Remove product row"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </TableCell>

      <SerialNumberDialog
        open={serialDialogOpen}
        onOpenChange={setSerialDialogOpen}
        productName={item.productName}
        quantity={item.quantity}
        initialSerials={item.serials}
        onSave={(serials: string[]) => onChange(item.rowId, { serials })}
      />
    </TableRow>
  );
}