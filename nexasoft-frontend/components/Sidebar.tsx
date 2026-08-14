"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Truck,
  Users,
  Building2,
  CreditCard,
  Receipt,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
  Zap,
  Lock,
  History,
  ShieldCheck
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  href: string;
  shortcut?: string;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { id: "dashboard", label: "Command Center", icon: LayoutDashboard, href: "/dashboard" },
      { id: "pos", label: "Point of Sale", icon: ShoppingCart, badge: "NEW", shortcut: "F2", href: "/pos" },
    ],
  },
  {
    title: "Inventory Management",
    items: [
      { id: "products", label: "Products Database", icon: Package, href: "/products" },
      { id: "inventory", label: "Live Stock", icon: Warehouse, href: "/inventory" },
      { id: "purchases", label: "Purchases (Stock In)", icon: Truck, shortcut: "F3", href: "/purchases" },
    ],
  },
  {
    title: "Accounts & Ledgers",
    items: [
      { id: "customers", label: "Customers (Khatay)", icon: Users, shortcut: "F4", href: "/customers" },
      { id: "suppliers", label: "Suppliers (Vendors)", icon: Building2, href: "/suppliers" },
    ],
  },
  {
    title: "Finance Operations",
    items: [
      { id: "sales", label: "Sales History", icon: History, href: "/sales" },
      { id: "payments", label: "Market Payments", icon: CreditCard, href: "/payments" },
      { id: "expenses", label: "Company Expenses", icon: Receipt, href: "/expenses" },
    ],
  },
  {
    title: "Administration",
    items: [
      { id: "shifts", label: "Shift Controls", icon: Lock, href: "/shifts" },
    ],
  },
  {
    title: "Secure Cloud",
    items: [
      { id: "godam", label: "Godam Portal", icon: ShieldCheck, href: "/godam" },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavLink({ item, isActive, collapsed }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? `${item.label} ${item.shortcut ? `[${item.shortcut}]` : ''}` : undefined}
      className={`
        group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5
        text-sm font-bold transition-all duration-300 ease-out overflow-hidden
        ${collapsed ? "justify-center px-2" : ""}
        ${
          isActive
            ? "bg-indigo-600/20 text-indigo-300 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.3)] backdrop-blur-sm"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-6 w-[4px] -translate-y-1/2 rounded-r-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
      )}

      {/* Icon */}
      <Icon
        size={20}
        className={`shrink-0 transition-all duration-300 ${
          isActive
            ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
            : "text-slate-500 group-hover:text-slate-300"
        }`}
      />

      {/* Label */}
      {!collapsed && (
        <span className="truncate transition-opacity duration-200 flex-1">
          {item.label}
        </span>
      )}

      {/* Badge / Shortcut */}
      {!collapsed && (
        <div className="flex items-center gap-2">
          {item.shortcut && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition-colors ${isActive ? 'bg-indigo-500/30 text-indigo-300 border-indigo-400/50' : 'bg-white/5 text-slate-500 border-white/10 group-hover:text-slate-400'}`}>
              {item.shortcut}
            </span>
          )}
          {item.badge && (
            <span className="flex h-5 items-center justify-center rounded-full bg-indigo-500 px-2 text-[10px] font-black tracking-widest text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]">
              {item.badge}
            </span>
          )}
        </div>
      )}

      {/* Collapsed badge dot */}
      {collapsed && item.badge && (
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 border border-[#0f1117]" />
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <span
          className="
            pointer-events-none absolute left-full ml-3 z-50
            whitespace-nowrap rounded-lg bg-slate-800 border border-slate-700 px-3 py-2
            text-xs font-bold text-slate-100 shadow-xl
            opacity-0 translate-x-1 transition-all duration-150
            group-hover:opacity-100 group-hover:translate-x-0 flex items-center gap-2
          "
        >
          {item.label}
          {item.shortcut && (
            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300 border border-slate-600">
              {item.shortcut}
            </span>
          )}
          {item.badge && (
            <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] text-white">
              {item.badge}
            </span>
          )}
          <span className="absolute left-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
        </span>
      )}
    </Link>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  if (pathname === "/login") return null;

  return (
    <aside
      className={`
        hidden md:flex relative h-screen flex-col shrink-0
        bg-[#0f1117] border-r border-white/[0.08] shadow-[4px_0_24px_rgba(0,0,0,0.2)]
        transition-all duration-300 ease-in-out z-50
        ${collapsed ? "w-[72px]" : "w-[260px]"}
      `}
    >
      {/* ── Brand ── */}
      <div
        className={`
          flex h-20 shrink-0 items-center border-b border-white/[0.08]
          ${collapsed ? "justify-center px-3" : "gap-3 px-5"}
        `}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
          <Zap size={20} className="text-white" fill="white" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-none text-white tracking-tight">
              Tayyab & Hassan
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Traders
              </p>
              <span className="px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[8px] font-black border border-indigo-500/30">PRO</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="
          absolute -right-3.5 top-[60px] z-20
          flex h-7 w-7 items-center justify-center
          rounded-full border border-white/10 bg-[#1a1d27]
          text-slate-400 shadow-[0_0_10px_rgba(0,0,0,0.5)]
          hover:border-indigo-500/50 hover:bg-[#232736] hover:text-indigo-400
          transition-all duration-200
        "
        title={collapsed ? "Expand Command Center" : "Collapse Command Center"}
      >
        {collapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>

      {/* ── Scrollable nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-5 custom-scrollbar">
        <div className={`space-y-6 ${collapsed ? "px-2" : "px-4"}`}>
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && !collapsed && (
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {section.title}
                </p>
              )}

              {section.title && collapsed && (
                <div className="my-2 mx-auto h-px w-8 bg-white/[0.08]" />
              )}

              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    item={item}
                    isActive={pathname.includes(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Bottom: Profile + Logout ── */}
      <div className={`shrink-0 border-t border-white/[0.08] py-4 bg-[#0a0c10] ${collapsed ? "px-2" : "px-4"}`}>
        <button
          className={`
            group flex w-full items-center gap-3 rounded-xl px-3 py-3
            text-sm text-slate-400 transition-all duration-200
            hover:bg-white/5 hover:text-slate-200 border border-transparent hover:border-white/10
            ${collapsed ? "justify-center px-2" : ""}
          `}
          title={collapsed ? "System Administrator" : undefined}
        >
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-sm font-black text-white shadow-sm border border-slate-600">
              TH
            </div>
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0a0c10] bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-black text-slate-200">
                System Admin
              </p>
              <p className="truncate text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Master Control
              </p>
            </div>
          )}

          {!collapsed && (
            <UserCircle size={18} className="shrink-0 text-slate-600 group-hover:text-indigo-400 transition-colors" />
          )}

          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-slate-100 shadow-xl opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
              Admin Profile
              <span className="absolute left-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
            </span>
          )}
        </button>

        <button
          className={`
            group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 mt-1
            text-sm font-bold text-slate-500 transition-all duration-200
            hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20
            ${collapsed ? "justify-center px-2" : ""}
          `}
          title={collapsed ? "Secure Logout" : undefined}
          onClick={() => {
            if (typeof window !== 'undefined') {
              document.cookie = "isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.href = '/login';
            }
          }}
        >
          <LogOut size={18} className="shrink-0 transition-colors duration-200 group-hover:text-rose-400" />
          {!collapsed && <span className="truncate">Secure Logout</span>}

          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-rose-900 border border-rose-800 px-3 py-2 text-xs font-bold text-white shadow-xl opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
              Secure Logout
              <span className="absolute left-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-rose-900" />
            </span>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </aside>
  );
}