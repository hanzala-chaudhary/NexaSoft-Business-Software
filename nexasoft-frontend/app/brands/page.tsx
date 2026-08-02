"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Tag, Trash2, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", country: "" });

  const fetchBrands = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/brands`);
      if (!res.ok) throw new Error("Failed to fetch brands");
      setBrands(await res.json());
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name) return setFormError("Brand ka naam zaroori hai!");

    try {
      setIsSaving(true);
      const res = await fetch(`${API_URL}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Save failed");

      await fetchBrands();
      setIsDialogOpen(false);
      setForm({ name: "", country: "" });
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Kya aap waqai is brand ko delete karna chahte hain?")) return;
    try {
      const res = await fetch(`${API_URL}/brands/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Delete failed");
      setBrands(brands.filter((b) => b.id !== id));
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brands</h1>
          <p className="text-sm text-slate-500">Samsung, Seagate, WD jaisi companies manage karein.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(""); }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="h-4 w-4" /> Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleAdd}>
              <DialogHeader><DialogTitle>Add New Brand</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                {formError && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Brand Name</Label>
                  <Input id="name" placeholder="e.g. Samsung" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country (optional)</Label>
                  <Input id="country" placeholder="e.g. South Korea" value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Saving..." : "Save Brand"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[60px]">Icon</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
              ) : brands.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Koi brand add nahi hui abhi tak.</TableCell></TableRow>
              ) : (
                brands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50">
                        <Tag className="h-4 w-4 text-indigo-500" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-slate-500">{b.country || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}