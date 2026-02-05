import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ClipboardList, 
  FileText, 
  Settings,
  ShieldAlert,
  Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <div className="fixed left-0 top-0 h-full w-64 border-r border-zinc-200 bg-zinc-50 flex flex-col z-20">
      <div className="h-16 flex items-center px-6 border-b border-zinc-200 bg-white">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
            IMS
          </div>
          <span>Admin</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <NavItem to="/products" icon={<Package size={20} />} label="Products" />
        <NavItem to="/warehouses" icon={<Warehouse size={20} />} label="Warehouses" />
        
        <div className="pt-4 pb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Inventory
        </div>
        <NavItem to="/inventory/balances" icon={<ClipboardList size={20} />} label="Balances" />
        <NavItem to="/inventory/ledger" icon={<FileText size={20} />} label="Ledger" />

        <div className="pt-4 pb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Documents
        </div>
        <NavItem to="/documents/receipts" icon={<FileText size={20} />} label="Receipts" />
        <NavItem to="/documents/shipments" icon={<FileText size={20} />} label="Shipments" />
        <NavItem to="/documents/adjustments" icon={<FileText size={20} />} label="Adjustments" />
        <NavItem to="/documents/counts" icon={<FileText size={20} />} label="Counts" />

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              System
            </div>
            <NavItem to="/audit-logs" icon={<ShieldAlert size={20} />} label="Audit Logs" />
            <NavItem to="/users" icon={<Users size={20} />} label="Users" />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-zinc-200">
        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-zinc-200 text-zinc-900"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
