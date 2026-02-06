import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { SupabaseStatus } from '../SupabaseStatus';
import { useAuth } from '../../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function TopBar() {
  const { user, role, signOut } = useAuth();

  return (
    <div className="fixed top-0 left-64 right-0 h-16 border-b border-zinc-200 bg-white z-10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 w-96" />

      <div className="flex items-center gap-4">
        <SupabaseStatus />
        <div className="h-6 w-px bg-zinc-200" />
        
        <button className="text-zinc-500 hover:text-zinc-900">
          <Bell size={20} />
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2">
              <User size={16} className="text-zinc-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">{user?.email}</span>
                <span className="text-xs font-normal text-zinc-500 capitalize">{role}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
