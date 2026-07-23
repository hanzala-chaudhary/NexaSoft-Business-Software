import type { SerialHistoryEvent } from "@/types/serial";
import { formatDate } from "@/lib/serial-utils";
import { CheckCircle2 } from "lucide-react";

const BRANCH_LABELS = new Set(["Sold", "Returned", "RMA Raised"]);

export function SerialTimeline({ events }: { events: SerialHistoryEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No history recorded yet.</p>;
  }

  return (
    <ol className="relative ml-3 space-y-6 border-l-2 border-dashed border-border pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ${
              BRANCH_LABELS.has(event.label) ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-semibold text-foreground">{event.label}</p>
          <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
          {event.description && <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>}
        </li>
      ))}
    </ol>
  );
}