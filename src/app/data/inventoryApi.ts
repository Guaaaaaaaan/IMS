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
  products?: { name: string; sku_code?: string };
  warehouses?: { name: string };
}

export const listInventoryBalances = async ({ warehouseId, search, limit = 50, offset = 0 }: { warehouseId?: string, search?: string, limit?: number, offset?: number }) => {
  const normalizedSearch = search?.trim() || '';
  console.log('listInventoryBalances params:', { warehouseId, search: normalizedSearch });
  // Use inner join if searching to filter parent rows
  const productJoin = normalizedSearch ? 'products!inner' : 'products';
  const warehouseJoin = 'warehouses';
  // ONLY apply filter if ID is a valid string (length > 10)
  // Skip if it is 'all', '', undefined, or null
  const normalizedWarehouseId =
    warehouseId && warehouseId !== 'all' && warehouseId.trim() !== '' ? warehouseId : undefined;
  const shouldFilterByWarehouse = !!(normalizedWarehouseId && normalizedWarehouseId.length > 10);

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
      ${warehouseJoin} (
        name
      )
    `, { count: 'exact' })
    .range(offset, offset + limit - 1);

  if (shouldFilterByWarehouse && normalizedWarehouseId) {
    query = query.eq('warehouse_id', normalizedWarehouseId);
  }

  if (normalizedSearch) {
     // Filter on the joined table columns
     // Note: .or() with foreign table requires specific syntax or manual filter string construction
     // Simplest is to just filter by sku_code if search looks like sku, or name.
     // Supabase JS .or() on foreign table:
     // .or('sku_code.ilike.%term%,name.ilike.%term%', { foreignTable: 'products' })
     query = query.or(`sku_code.ilike.%${normalizedSearch}%,name.ilike.%${normalizedSearch}%`, { foreignTable: 'products' });
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

export const listLedger = async ({ warehouseId, sku, startDate, endDate, limit = 50, offset = 0 }: { warehouseId?: string, sku?: string, startDate?: Date, endDate?: Date, limit?: number, offset?: number }) => {
  const normalizedSku = sku?.trim() || '';
  const normalizedWarehouseId =
    warehouseId && warehouseId !== 'all' && warehouseId.trim() !== '' ? warehouseId : undefined;

  let query = supabase
    .from('inventory_ledger')
    .select(`
      *,
      products (sku_code, name),
      warehouses (name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (normalizedWarehouseId) query = query.eq('warehouse_id', normalizedWarehouseId);
  if (normalizedSku) query = query.ilike('sku', `%${normalizedSku}%`);
  if (startDate) query = query.gte('created_at', startDate.toISOString());
  if (endDate) query = query.lte('created_at', endDate.toISOString());

  const { data, error, count } = await query;
  if (error) return { data: [], error };

  const mapped = (data || []).map((entry: any) => ({
    ...entry,
    sku: entry.sku || entry.products?.sku_code || 'Unknown',
    products: entry.products,
    warehouses: entry.warehouses,
  }));

  return { data: mapped as LedgerEntry[], error, count };
};
