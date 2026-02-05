/*
  Dashboard Widget Audit:
  [x] Total SKUs: Converted to Supabase count(products).
  [x] Total Warehouses: Converted to Supabase count(warehouses).
  [x] Total On-hand Qty: Converted to sum(inventory_balances.on_hand). Fallback to ledger provided.
  [x] Posted Docs (7d): Converted to Supabase query on 'documents'.
  [x] Low Stock Alert: Converted to Supabase query on 'inventory_balances'.
  [x] Recent Activity: Converted to Supabase query on 'audit_logs'.
*/

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Package, Warehouse, Layers, FileCheck, AlertTriangle, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  getDashboardSummary, 
  getLowStockTop5, 
  getRecentActivity, 
  DashboardSummary, 
  LowStockItem, 
  RecentActivityItem 
} from '../data/dashboardApi';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState<DashboardSummary>({
    totalSKUs: 0,
    totalWarehouses: 0,
    totalOnHand: null,
    docsPostedRecent: 0
  });
  
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [summaryData, lowStockData, activityData] = await Promise.all([
          getDashboardSummary(),
          getLowStockTop5(),
          getRecentActivity()
        ]);
        
        setSummary(summaryData);
        setLowStockItems(lowStockData);
        setRecentActivity(activityData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
     return (
        <div className="space-y-6">
           <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                 <Card key={i} className="animate-pulse">
                    <CardContent className="h-24" />
                 </Card>
              ))}
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 h-64 animate-pulse" />
              <Card className="h-64 animate-pulse" />
           </div>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total SKUs" 
          value={summary.totalSKUs} 
          icon={<Package className="text-blue-500" />} 
        />
        <KpiCard 
          title="Total Warehouses" 
          value={summary.totalWarehouses} 
          icon={<Warehouse className="text-purple-500" />} 
        />
        <KpiCard 
          title="Total On-hand Qty" 
          value={summary.totalOnHand} 
          icon={<Layers className="text-indigo-500" />} 
          placeholder={summary.totalOnHand === null ? "—" : undefined}
          subtext={summary.totalOnHand === null ? "Inv. data not configured" : undefined}
        />
        <KpiCard 
          title="Posted Docs (7d)" 
          value={summary.docsPostedRecent} 
          icon={<FileCheck className="text-green-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Table - Takes up 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Alert (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader>
                   <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {lowStockItems.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={5} className="text-center h-24 text-zinc-500">
                            {summary.totalOnHand === null 
                               ? "Inventory data not configured"
                               : "No low stock items found."}
                         </TableCell>
                      </TableRow>
                   ) : (
                      lowStockItems.map((item, idx) => (
                         <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="text-sm truncate max-w-[150px]">{item.productName}</TableCell>
                            <TableCell className="text-xs text-zinc-500">{item.warehouseName}</TableCell>
                            <TableCell className="text-right font-bold text-orange-600">{item.available}</TableCell>
                            <TableCell className="text-right">
                               <span 
                                  className="text-xs text-blue-600 cursor-pointer hover:underline" 
                                  onClick={() => navigate(`/inventory/product/${item.sku}`)} // Updated link logic
                               >
                                  Restock
                               </span>
                            </TableCell>
                         </TableRow>
                      ))
                   )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-zinc-500" />
                Recent Activity
             </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-6">
                {recentActivity.map((entry, i) => (
                   <div key={entry.id || i} className="flex gap-4 relative">
                      {/* Timeline line */}
                      {i !== recentActivity.length - 1 && (
                         <div className="absolute left-2.5 top-6 bottom-[-24px] w-px bg-zinc-200" />
                      )}
                      
                      <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5 z-10 text-zinc-500">
                         <div className="w-2 h-2 rounded-full bg-zinc-500" />
                      </div>
                      
                      <div className="space-y-1">
                         <p className="text-sm font-medium">
                            {entry.description}
                         </p>
                         <p className="text-xs text-zinc-500">
                            by {entry.actorEmail || 'System'}
                         </p>
                         <p className="text-[10px] text-zinc-400">
                            {format(new Date(entry.timestamp), 'MMM d, HH:mm')}
                         </p>
                      </div>
                   </div>
                ))}
                {recentActivity.length === 0 && <p className="text-sm text-zinc-500">No recent activity.</p>}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ 
   title, 
   value, 
   icon, 
   placeholder,
   subtext
}: { 
   title: string, 
   value: number | null, 
   icon: React.ReactNode, 
   placeholder?: string,
   subtext?: string
}) {
   return (
      <Card>
         <CardContent className="p-6 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-zinc-500">{title}</p>
               <h3 className="text-2xl font-bold mt-1">
                  {placeholder || value?.toLocaleString() || 0}
               </h3>
               {subtext && <p className="text-xs text-zinc-400 mt-1">{subtext}</p>}
            </div>
            <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
               {icon}
            </div>
         </CardContent>
      </Card>
   );
}
