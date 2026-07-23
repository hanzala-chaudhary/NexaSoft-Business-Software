"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    // Yahan aap apna Secret Password set karein!
    if (password === "nexasoft123") {
      setError(false);
      // Login successful hone par Dashboard par bhej dega
      router.push("/dashboard"); 
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0f1117] p-4 absolute inset-0 z-[100]">
      <Card className="w-full max-w-md border-white/10 bg-[#1a1d27] shadow-2xl">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">NexaSoft Admin</CardTitle>
          <CardDescription className="text-slate-400">
            Enter your secure credentials to access the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  type="password"
                  placeholder="Enter Secret Password"
                  className={`pl-10 h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 ${
                    error ? "border-rose-500 focus-visible:ring-rose-500" : ""
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-rose-500 font-medium px-1">
                  Incorrect password. Access denied.
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-semibold"
            >
              Unlock System
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}