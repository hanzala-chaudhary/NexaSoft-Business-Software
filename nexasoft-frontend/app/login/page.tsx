"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      document.cookie = "isLoggedIn=true; path=/; max-age=86400";
      router.push("/");
    } else {
      setError("Ghalat PIN. Dobara koshish karein.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
          Tayyab & Hassan Traders
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Login PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="Enter PIN (1234)"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 text-white transition-colors hover:bg-indigo-700"
          >
            System Login
          </button>
        </form>
      </div>
    </div>
  );
}