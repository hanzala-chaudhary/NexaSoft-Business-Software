"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Unlock, Clock, Banknote, History, Wallet, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ShiftsPage() {
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Forms State
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Close Shift Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [currentRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/shifts/current`),
        fetch(`${API_URL}/shifts/history`)
      ]);

      if (currentRes.ok) {
        const currentText = await currentRes.text();
        setCurrentShift(currentText ? JSON.parse(currentText) : null);
      }
      
      if (historyRes.ok) {
        setShiftHistory(await historyRes.json());
      }
    } catch (error) {
      console.error("Shift Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShift = async () => {
    if (!openingCash || Number(openingCash) < 0) {
      alert("Opening cash sahi se darj karein!");
      return;
    }

    try {
      setIsProcessing(true);
      const res = await fetch(`${API_URL}/shifts/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opening_cash: Number(openingCash) })
      });

      if (!res.ok) throw new Error("Shift open nahi ho saki");
      
      setOpeningCash("");
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    if (!closingCash || Number(closingCash) < 0) {
      alert("Gally (Drawer) mein maujood closing cash darj karein!");
      return;
    }

    try {
      setIsProcessing(true);
      const res = await fetch(`${API_URL}/shifts/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          closing_cash: Number(closingCash),
          notes: closingNotes 
        })
      });

      if (!res.ok) throw new Error("Shift close nahi ho saki");
      
      setIsCloseModalOpen(false);
      setClosingCash("");
      setClosingNotes("");
      await fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shift Management</h1>
        <p className="text-sm text-slate-500 mt-1">Day Open aur Day Close karein, aur cash ka poora hisaab rakhein.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- ACTIVE SHIFT CARD --- */}
          <Card className={`shadow-sm border-2 lg:col-span-1 ${currentShift ? 'border-emerald-500 bg-emerald-50/30' : 'border-indigo-200 bg-white'}`}>
            <CardHeader className="border-b bg-white/50 pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {currentShift ? <Unlock className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-slate-400" />}
                  {currentShift ? "Active Shift (Day Open)" : "Start New Shift"}
                </span>
                {currentShift ? (
                  <Badge className="bg-emerald-500 text-white animate-pulse shadow-sm">OPEN</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500">CLOSED</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {currentShift ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Opened By</p>
                      <p className="font-bold text-slate-800">{currentShift.opened_by}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Time</p>
                      <p className="font-bold text-slate-800">{new Date(currentShift.opening_time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="bg-emerald-100 p-4 rounded-lg border border-emerald-200 text-center">
                    <p className="text-sm font-bold text-emerald-700 uppercase">Opening Cash (Gally mein kitne the)</p>
                    <p className="text-3xl font-black text-emerald-900 mt-1">Rs. {Number(currentShift.opening_cash).toLocaleString()}</p>
                  </div>
                  <Button 
                    className="w-full h-14 text-lg font-bold bg-rose-600 hover:bg-rose-700 shadow-md gap-2"
                    onClick={() => setIsCloseModalOpen(true)}
                  >
                    <Lock className="h-5 w-5" /> End Shift (Day Close)
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 py-4">
                  <div className="text-center space-y-2">
                    <Wallet className="h-12 w-12 text-indigo-200 mx-auto" />
                    <p className="text-sm font-medium text-slate-500">Dukaan kholne se pehle drawer ka cash enter karein.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Opening Cash (PKR)</Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input 
                        type="number" 
                        min="0"
                        className="pl-10 h-14 text-xl font-bold bg-slate-50"
                        placeholder="e.g. 5000"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md gap-2"
                    onClick={handleOpenShift}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Unlock className="h-5 w-5" />}
                    Start Shift
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* --- SHIFT HISTORY TABLE --- */}
          <Card className="shadow-sm border-slate-200 lg:col-span-2 bg-white flex flex-col">
            <CardHeader className="border-b bg-transparent pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                <History className="h-5 w-5 text-indigo-500" /> Shift History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-bold text-slate-600">Date</TableHead>
                    <TableHead className="font-bold text-slate-600">Open - Close Time</TableHead>
                    <TableHead className="text-right font-bold text-slate-600">Opening Cash</TableHead>
                    <TableHead className="text-right font-bold text-slate-600">Actual Closing</TableHead>
                    <TableHead className="text-center font-bold text-slate-600">Cash Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">No previous shifts found.</TableCell></TableRow>
                  ) : (
                    shiftHistory.map((shift) => {
                      const diff = Number(shift.closing_cash) - Number(shift.expected_cash);
                      const isShort = diff < 0;
                      const isOver = diff > 0;
                      
                      return (
                        <TableRow key={shift.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-bold text-slate-800">
                            {new Date(shift.opening_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                              <Clock className="h-3.5 w-3.5 text-emerald-500" /> {new Date(shift.opening_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                              <span className="text-slate-300">→</span> 
                              {shift.closing_time ? (
                                <><Clock className="h-3.5 w-3.5 text-rose-500" /> {new Date(shift.closing_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-1 py-0 text-[10px]">Active</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600">Rs. {Number(shift.opening_cash).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-black text-slate-900">
                            {shift.closing_cash !== null ? `Rs. ${Number(shift.closing_cash).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {shift.status === 'OPEN' ? (
                              <span className="text-slate-400 text-xs italic">In Progress</span>
                            ) : diff === 0 ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Perfect Match</Badge>
                            ) : isShort ? (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 justify-center w-fit mx-auto">
                                <TrendingDown className="h-3 w-3" /> Short Rs. {Math.abs(diff).toLocaleString()}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 justify-center w-fit mx-auto">
                                <TrendingUp className="h-3 w-3" /> Extra Rs. {Math.abs(diff).toLocaleString()}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- DAY CLOSE MODAL --- */}
      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl flex items-center gap-2 text-rose-600">
              <Lock className="h-5 w-5" /> End Shift (Day Close)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                Shift close karne ke baad aap is shift mein mazeed sales ya returns nahi kar sakenge. System automatically total sales aur expenses ka hisaab lagayega.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Gally (Drawer) ka total cash ginein *</Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="number" 
                  min="0"
                  className="pl-10 h-14 text-2xl font-black text-rose-600 bg-slate-50"
                  placeholder="e.g. 25000"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">Isme aaj ki opening cash, sales, minus kharche sab shamil hain.</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Notes (Optional)</Label>
              <Input 
                placeholder="Agar cash kam ya zyada hai toh wajah likhein..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 gap-2 font-bold shadow-md" onClick={handleCloseShift} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Close Shift Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}