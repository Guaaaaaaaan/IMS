import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Toaster } from 'sonner';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950">
      <Sidebar />
      <TopBar />
      <main className="pl-64 pt-16 min-h-screen">
        <div className="container mx-auto p-8 max-w-7xl">
          {children}
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
