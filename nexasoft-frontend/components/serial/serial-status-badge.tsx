import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SerialStatus } from "@/types/serial";
import { SERIAL_STATUS_LABELS, SERIAL_STATUS_STYLES } from "@/lib/serial-utils";

export function SerialStatusBadge({ status, className }: { status: SerialStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", SERIAL_STATUS_STYLES[status], className)}>
      {SERIAL_STATUS_LABELS[status]}
    </Badge>
  );
}