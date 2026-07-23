import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function PlaceholderPage() {
  return (
    <div className="flex h-[80vh] items-center justify-center p-6">
      <Card className="max-w-md w-full border-dashed border-2 border-slate-200 bg-white/50">
        <CardContent className="flex flex-col items-center text-center p-10 gap-4">
          <div className="rounded-full bg-indigo-50 p-4">
            <Wrench className="h-8 w-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Coming Soon</h2>
          <p className="text-sm text-slate-500">
            This module is being configured for your business. It will be available in the next update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}