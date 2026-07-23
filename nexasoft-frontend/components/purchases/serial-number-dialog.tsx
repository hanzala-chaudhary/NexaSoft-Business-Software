import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SerialNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  quantity: number;
  initialSerials: string[];
  onSave: (serials: string[]) => void;
}

export function SerialNumberDialog({
  open,
  onOpenChange,
  productName,
  quantity,
  initialSerials,
  onSave,
}: SerialNumberDialogProps) {
  const [serials, setSerials] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = Array.from({ length: quantity }, (_, i) => initialSerials[i] ?? "");
    setSerials(next);
    setError(null);
  }, [open, quantity, initialSerials]);

  function handleChange(index: number, value: string) {
    setSerials((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  }

  function handleSave() {
    const trimmed = serials.map((s) => s.trim());

    if (trimmed.some((s) => s.length === 0)) {
      setError("Every serial number field must be filled in.");
      return;
    }
    if (trimmed.length !== quantity) {
      setError(`Serial count must equal quantity (${quantity}).`);
      return;
    }
    const unique = new Set(trimmed);
    if (unique.size !== trimmed.length) {
      setError("Serial numbers must be unique.");
      return;
    }

    onSave(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Serial numbers</DialogTitle>
          <DialogDescription>
            {productName || "Product"} · enter one serial number for each of the {quantity} unit
            {quantity === 1 ? "" : "s"} received.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-3">
          <div className="space-y-3">
            {serials.map((serial, index) => (
              <div key={index} className="space-y-1.5">
                <Label htmlFor={`serial-${index}`}>Unit {index + 1}</Label>
                <Input
                  id={`serial-${index}`}
                  value={serial}
                  onChange={(e) => handleChange(index, e.target.value)}
                  placeholder={`e.g. SN00${index + 1}`}
                  autoFocus={index === 0}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save serials</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}