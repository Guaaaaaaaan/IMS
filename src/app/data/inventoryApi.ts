import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

export interface InventoryBalance {
  product_id: string;
  warehouse_id: string;
  on_hand: number;
  updated_at: string;
  // Computed for UI convenience
  sku: string; 
  // Joins
  products?: { sku_code: string; name: string; uom: string };
  warehouses?: { name: string };
}

export interface LedgerEntry {
  id: string;
  sku: string;
  warehouse_id: string;
  doc_id: string;
  doc_type: string;
  delta: number;
  created_at: string;
  description?: string;
  // Joins
  products?: { name: string };
  warehouses?: { name: string };
}

export const listInventoryBalances = async ({ warehouseId, search, limit = 50, offset = 0 }: { warehouseId?: string, search?: string, limit?: number, offset?: number }) => {
  // Use inner join if searching to filter parent rows
  const productJoin = search ? 'products!inner' : 'products';
  
  let query = supabase
    .from('inventory_balances')
    .select(`
      product_id,
      warehouse_id,
      on_hand,
      updated_at,
      ${productJoin} (
        sku_code,
        name,
        uom
      ),
      warehouses (
        name
      )
    `)
    .range(offset, offset + limit - 1);

  if (warehouseId && warehouseId !== 'all') {
    query = query.eq('warehouse_id', warehouseId);
  }

  if (search) {
     // Filter on the joined table columns
     // Note: .or() with foreign table requires specific syntax or manual filter string construction
     // Simplest is to just filter by sku_code if search looks like sku, or name.
     // Supabase JS .or() on foreign table:
     // .or('sku_code.ilike.%term%,name.ilike.%term%', { foreignTable: 'products' })
     query = query.or(`sku_code.ilike.%${search}%,name.ilike.%${search}%`, { foreignTable: 'products' });
  }

  query = query.order('on_hand', { ascending: true }); 

  const { data, error, count } = await query;
  
  if (error) {
     if (error.code === 'PGRST200' || error.message?.includes('Could not find')) {
        toast.error("Schema cache error. Please run: notify pgrst, 'reload schema'");
     }
     return { data: [], error, count: 0 };
  }

  const mapped = (data || []).map((item: any) => ({
     ...item,
     sku: item.products?.sku_code || 'Unknown',
     products: item.products,
     warehouses: item.warehouses
  }));

  return { data: mapped as InventoryBalance[], error, count };
};

export const listLedger = async ({ warehouseId, sku, startDate, endDate, limit = 50 }: { warehouseId?: string, sku?: string, startDate?: Date, endDate?: Date, limit?: number }) => {
  let query = supabase
    .from('inventory_ledger')
    .select(`
      *,
      products!sku (name),
      warehouses (name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (warehouseId && warehouseId !== 'all') query = query.eq('warehouse_id', warehouseId);
  if (sku) query = query.ilike('sku', `%${sku}%`);
  if (startDate) query = query.gte('created_at', startDate.toISOString());
  if (endDate) query = query.lte('created_at', endDate.toISOString());

  const { data, error } = await query;
  return { data: data as LedgerEntry[], error };
};
