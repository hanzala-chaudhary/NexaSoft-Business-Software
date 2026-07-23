import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types/purchase";
import { paymentStatusStyles } from "@/lib/purchase-utils";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", paymentStatusStyles[status])}
    >
      {status}
    </Badge>
  );
}