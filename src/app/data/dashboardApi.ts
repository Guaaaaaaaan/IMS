import { supabase } from '../lib/supabaseClient';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

export interface DashboardSummary {
  totalSKUs: number;
  totalWarehouses: number;
  totalOnHand: number | null; // null indicates "not configured"
  docsPostedRecent: number;
}

export interface LowStockItem {
  sku: string;
  productName: string;
  warehouseName: string;
  onHand: number;
  available: number;
  warehouseId: string;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  actorEmail?: string;
  delta?: number; // for legacy ledger support if needed
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  // 1. Total SKUs
  const { count: skuCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // 2. Total Warehouses (Try 'warehouses' table)
  let warehouseCount = 0;
  try {
    const { count, error } = await supabase
      .from('warehouses')
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      warehouseCount = count || 0;
    }
  } catch (e) {
    console.warn('Warehouses table likely missing', e);
  }

  // 3. Total On Hand (Try 'inventory_balances' first)
  let totalOnHand: number | null = null;
  
  // Attempt 1: inventory_balances
  const { data: balanceData, error: balanceError } = await supabase
    .from('inventory_balances')
    .select('on_hand'); 

  if (!balanceError && balanceData) {
    totalOnHand = balanceData.reduce((acc, curr) => acc + (curr.on_hand || 0), 0);
  } else {
    // Attempt 2: ledger_entries (fallback)
    const { data: ledgerData, error: ledgerError } = await supabase
       .from('ledger_entries')
       .select('delta');
    
    if (!ledgerError && ledgerData) {
       totalOnHand = ledgerData.reduce((acc, curr) => acc + (curr.delta || 0), 0);
    }
  }

  // 4. Posted Docs (Last 7 Days)
  // Assuming 'documents' table. If it doesn't exist, this will return error/0.
  let docsCount = 0;
  const { count: docsData, error: docsError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'posted')
    .gte('posted_at', sevenDaysAgo); 

  if (!docsError) {
    docsCount = docsData || 0;
  }

  return {
    totalSKUs: skuCount || 0,
    totalWarehouses: warehouseCount,
    totalOnHand,
    docsPostedRecent: docsCount
  };
};

export const getLowStockTop5 = async (): Promise<LowStockItem[]> => {
  // Use FK relationships: product_id -> products.id, warehouse_id -> warehouses.id
  // Filter on_hand < 10 (threshold)
  
  const { data, error } = await supabase
    .from('inventory_balances')
    .select(`
      product_id,
      warehouse_id,
      on_hand,
      products (
        id,
        sku_code,
        name,
        uom
      ),
      warehouses (
        id,
        name
      )
    `)
    .lt('on_hand', 10)
    .order('on_hand', { ascending: true })
    .limit(5);

  if (error) {
    console.warn('Could not fetch low stock from inventory_balances', error);
    // Robust error handling for schema cache issues
    if (error.message?.includes('Could not find') || error.code === 'PGRST200') {
        toast.error("Database schema cache error. Please run: notify pgrst, 'reload schema'");
    }
    return [];
  }

  return (data || []).map((item: any) => ({
    sku: item.products?.sku_code || 'Unknown',
    productName: item.products?.name || 'Unknown',
    warehouseName: item.warehouses?.name || 'Unknown',
    onHand: item.on_hand,
    available: item.on_hand, // Map available to onHand since available column is not guaranteed
    warehouseId: item.warehouse_id
  }));
};

export const getRecentActivity = async (): Promise<RecentActivityItem[]> => {
  // Use documents as recent activity to avoid missing audit_logs table
  const { data: docs, error: docError } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!docError && docs) {
     return docs.map((doc: any) => ({
        id: doc.id,
        action: 'DOC_CREATED',
        description: `Document ${doc.type} created`,
        timestamp: doc.created_at,
        actorEmail: 'System'
     }));
  }

  return [];
};
