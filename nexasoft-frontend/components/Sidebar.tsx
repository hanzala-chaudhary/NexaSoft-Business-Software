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
  badge?: number;
  href: string;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { id: "pos", label: "POS", icon: ShoppingCart, badge: 3, href: "/pos" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { id: "products", label: "Products", icon: Package, href: "/products" },
      { id: "inventory", label: "Inventory", icon: Warehouse, href: "/inventory" },
      { id: "purchases", label: "Purchases", icon: Truck, href: "/purchases" },
    ],
  },
  {
    title: "Stakeholders",
    items: [
      { id: "customers", label: "Customers", icon: Users, href: "/customers" },
      { id: "suppliers", label: "Suppliers", icon: Building2, href: "/suppliers" },
    ],
  },
  {
    title: "Finance & Sales",
    items: [
      { id: "payments", label: "Payments", icon: CreditCard, href: "/payments" },
      { id: "expenses", label: "Expenses", icon: Receipt, href: "/expenses" },
      { id: "sales", label: "Sales History", icon: History, href: "/sales" },
    ],
  },
  {
    title: "Administration",
    items: [
      { id: "shifts", label: "Shift Management", icon: Lock, href: "/shifts" },
    ],
  },
  {
    title: "Secure Vault",
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
      title={collapsed ? item.label : undefined}
      className={`
        group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5
        text-sm font-medium transition-all duration-200 ease-out
        ${collapsed ? "justify-center px-2" : ""}
        ${
          isActive
            ? "bg-indigo-500/20 text-indigo-300 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-400" />
      )}

      {/* Icon */}
      <Icon
        size={18}
        className={`shrink-0 transition-colors duration-200 ${
          isActive
            ? "text-indigo-400"
            : "text-slate-500 group-hover:text-slate-300"
        }`}
      />

      {/* Label */}
      {!collapsed && (
        <span className="truncate transition-opacity duration-200">
          {item.label}
        </span>
      )}

      {/* Badge */}
      {!collapsed && item.badge !== undefined && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold text-white">
          {item.badge}
        </span>
      )}

      {/* Collapsed badge dot */}
      {collapsed && item.badge !== undefined && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-400" />
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <span
          className="
            pointer-events-none absolute left-full ml-3 z-50
            whitespace-nowrap rounded-lg bg-slate-700 px-2.5 py-1.5
            text-xs font-medium text-slate-100 shadow-lg
            opacity-0 translate-x-1 transition-all duration-150
            group-hover:opacity-100 group-hover:translate-x-0
          "
        >
          {item.label}
          {item.badge !== undefined && (
            <span className="ml-1.5 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] text-white">
              {item.badge}
            </span>
          )}
          {/* Arrow */}
          <span className="absolute left-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
        </span>
      )}
    </Link>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Agar user Login page (/login) par hai, toh sidebar hide kar do
  if (pathname === "/login") return null;

  return (
    <aside
      className={`
        hidden md:flex relative h-screen flex-col shrink-0
        bg-[#0f1117] border-r border-white/[0.06]
        transition-all duration-300 ease-in-out z-50
        ${collapsed ? "w-[68px]" : "w-[240px]"}
      `}
    >
      {/* ── Brand ── */}
      <div
        className={`
          flex h-16 shrink-0 items-center border-b border-white/[0.06]
          ${collapsed ? "justify-center px-3" : "gap-2.5 px-4"}
        `}
      >
        {/* Logo mark */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]">
          <Zap size={16} className="text-white" fill="white" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-none text-slate-100 tracking-tight">
              Tayyab & Hassan
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-widest text-indigo-400">
              Traders
            </p>
          </div>
        )}
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="
          absolute -right-3 top-[52px] z-20
          flex h-6 w-6 items-center justify-center
          rounded-full border border-white/10 bg-[#1a1d27]
          text-slate-400 shadow-md
          hover:border-indigo-500/40 hover:text-indigo-300
          transition-all duration-150
        "
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* ── Scrollable nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none">
        <div className={`space-y-4 ${collapsed ? "px-2" : "px-3"}`}>
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {/* Section title */}
              {section.title && !collapsed && (
                <p className="mb-1 px-3 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  {section.title}
                </p>
              )}

              {/* Collapsed divider between sections with titles */}
              {section.title && collapsed && (
                <div className="my-1 mx-auto h-px w-6 bg-white/[0.08]" />
              )}

              <div className="space-y-0.5">
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
      <div className={`shrink-0 border-t border-white/[0.06] py-3 ${collapsed ? "px-2" : "px-3"}`}>
        {/* Profile */}
        <button
          className={`
            group flex w-full items-center gap-3 rounded-xl px-3 py-2.5
            text-sm text-slate-400 transition-all duration-200
            hover:bg-white/5 hover:text-slate-200
            ${collapsed ? "justify-center px-2" : ""}
          `}
          title={collapsed ? "Profile" : undefined}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm">
              T
            </div>
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[#0f1117] bg-emerald-400" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-slate-200">
                Tayyab & Hassan
              </p>
              <p className="truncate text-[10px] text-slate-500">
                Administrator
              </p>
            </div>
          )}

          {!collapsed && (
            <UserCircle
              size={15}
              className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors"
            />
          )}

          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-lg opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
              Profile
              <span className="absolute left-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          className={`
            group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 mt-0.5
            text-sm text-slate-500 transition-all duration-200
            hover:bg-rose-500/10 hover:text-rose-400
            ${collapsed ? "justify-center px-2" : ""}
          `}
          title={collapsed ? "Logout" : undefined}
          onClick={() => {
            if (typeof window !== 'undefined') {
              document.cookie = "isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.href = '/login';
            }
          }}
        >
          <LogOut
            size={16}
            className="shrink-0 transition-colors duration-200 group-hover:text-rose-400"
          />

          {!collapsed && <span className="truncate">Logout</span>}

          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-lg opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
              Logout
              <span className="absolute left-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}