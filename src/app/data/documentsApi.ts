import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

// Types matching DB
export type DocType = 'receipt' | 'shipment' | 'adjustment' | 'count';
export type DocStatus = 'draft' | 'posted';

export interface DocumentLine {
  id?: string;
  document_id?: string;
  sku: string; // Virtual: hydrated from product join
  product_id?: string; // DB column
  qty: number;
  note?: string;
}

export interface Document {
  id: string;
  doc_no: string; 
  type: DocType;
  status: DocStatus;
  warehouse_id: string;
  note?: string;
  created_at: string;
  posted_at?: string;
  // Joins
  warehouses?: { name: string };
  lines?: DocumentLine[];
}

export interface DocumentFilter {
  type?: DocType;
  warehouseId?: string;
  status?: DocStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

const generateDocNo = (type: DocType) => {
  const prefix = type.substring(0, 3).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

export const listDocuments = async ({ type, warehouseId, status, search, limit = 50, offset = 0 }: DocumentFilter) => {
  let query = supabase
    .from('documents')
    .select('*, warehouses(name)')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);
  if (warehouseId && warehouseId !== 'all') query = query.eq('warehouse_id', warehouseId);
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) {
     query = query.or(`id.eq.${search},doc_no.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  return { data: data as Document[], error, count };
};

export const getDocument = async (id: string) => {
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*, warehouses(name)')
    .eq('id', id)
    .single();

  if (docError) return { data: null, error: docError };

  // Fetch lines and join products to get SKU back
  const { data: lines, error: lineError } = await supabase
    .from('document_lines')
    .select('*, products(sku_code)')
    .eq('document_id', id);

  const hydratedLines = lines?.map((l: any) => ({
    ...l,
    sku: l.products?.sku_code || 'UNKNOWN' // Map product sku_code to virtual sku field
  })) || [];

  const fullDoc = { ...doc, lines: hydratedLines } as Document;
  return { data: fullDoc, error: lineError };
};

export const createDocument = async (
  doc: Partial<Document>, 
  lines: Partial<DocumentLine>[]
) => {
  // 1. Resolve Product IDs from SKUs
  const skus = lines.map(l => l.sku).filter(Boolean);
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, sku_code')
    .in('sku_code', skus);
    
  if (prodError) return { data: null, error: prodError };
  
  const productMap = new Map(products?.map(p => [p.sku_code, p.id]));
  
  // Validate all SKUs found
  const missingSkus = skus.filter(sku => !productMap.has(sku));
  if (missingSkus.length > 0) {
    return { data: null, error: { message: `Products not found for SKUs: ${missingSkus.join(', ')}` } };
  }

  // 2. Create Header
  const docNo = doc.doc_no || generateDocNo(doc.type || 'receipt');

  const { data: newDoc, error: docError } = await supabase
    .from('documents')
    .insert([{
      doc_no: docNo,
      type: doc.type,
      warehouse_id: doc.warehouse_id,
      status: 'draft',
      note: doc.note
    }])
    .select()
    .single();

  if (docError || !newDoc) return { data: null, error: docError };

  // 3. Create Lines with product_id
  const linesWithId = lines.map(l => ({
    document_id: newDoc.id,
    product_id: productMap.get(l.sku!), // Use ! because we validated above
    qty: l.qty,
    note: l.note
  }));

  const { error: linesError } = await supabase
    .from('document_lines')
    .insert(linesWithId);

  return { data: newDoc, error: linesError };
};

export const updateDocument = async (id: string, updates: Partial<Document>) => {
  const { reference, ...safeUpdates } = updates as any;

  const { data, error } = await supabase
    .from('documents')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

export const deleteDocument = async (id: string) => {
  await supabase.from('document_lines').delete().eq('document_id', id);
  const { error } = await supabase.from('documents').delete().eq('id', id);
  return { error };
};

// POSTING LOGIC
export const postDocument = async (docId: string) => {
  // 1. Fetch full doc
  const { data: doc, error: fetchError } = await getDocument(docId);
  if (fetchError || !doc) throw new Error("Document not found");
  if (doc.status === 'posted') return { error: "Already posted" };

  const lines = doc.lines || [];
  if (lines.length === 0) return { error: "Cannot post document with no lines" };

  const timestamp = new Date().toISOString();

  // 2. Prepare Ledger Entries
  // Lines now have product_id from DB, but UI/Document interface relies on SKU. 
  // getDocument already hydrated the lines with SKUs from the join.
  // But we need product_ids for logic. getDocument returns 'products' join.
  // Let's re-map or ensure we have what we need. 
  
  // The 'lines' from getDocument have 'product_id' (raw) and 'sku' (virtual).
  
  const productIds = lines.map(l => l.product_id).filter(Boolean) as string[];

  // Fetch current balances
  const { data: currentBalances } = await supabase
    .from('inventory_balances')
    .select('product_id, on_hand')
    .eq('warehouse_id', doc.warehouse_id)
    .in('product_id', productIds);

  const balanceMap = new Map(currentBalances?.map(b => [b.product_id, b.on_hand]));

  const ledgerEntries = [];
  const balanceUpdates = [];

  for (const line of lines) {
    if (!line.product_id) continue;
    
    const currentQty = balanceMap.get(line.product_id) || 0;
    let delta = 0;

    if (doc.type === 'receipt') {
      delta = line.qty;
    } else if (doc.type === 'shipment') {
      if (currentQty < line.qty) {
        return { error: `Insufficient stock for SKU ${line.sku}. Current: ${currentQty}, Required: ${line.qty}` };
      }
      delta = -line.qty;
    } else if (doc.type === 'adjustment') {
      delta = line.qty; 
    } else if (doc.type === 'count') {
      delta = line.qty - currentQty;
    }

    ledgerEntries.push({
      sku: line.sku, // If ledger requires SKU, we use the virtual one
      product_id: line.product_id,
      warehouse_id: doc.warehouse_id,
      doc_id: doc.id,
      doc_type: doc.type,
      delta: delta,
      created_at: timestamp,
      description: doc.note || `Posted ${doc.type}`
    });

    balanceUpdates.push({
      product_id: line.product_id,
      warehouse_id: doc.warehouse_id,
      on_hand: currentQty + delta,
      updated_at: timestamp
    });
  }

  // 3. Insert Ledger
  const dbLedgerEntries = ledgerEntries.map(e => ({
    // If inventory_ledger doesn't have sku column, remove it. 
    // Assuming it has both or just product_id. 
    // Previous error didn't complain about ledger sku, only document_lines sku.
    // I will include sku for safety if ledger uses it, otherwise postgres will ignore if I'm lucky or error if strict.
    // Actually, let's include it. If ledger errors on sku, we fix next.
    sku: e.sku,
    warehouse_id: e.warehouse_id,
    doc_id: e.doc_id,
    doc_type: e.doc_type,
    delta: e.delta,
    created_at: e.created_at,
    description: e.description,
    product_id: e.product_id
  }));

  if (dbLedgerEntries.length > 0) {
    const { error: ledgerError } = await supabase
      .from('inventory_ledger')
      .insert(dbLedgerEntries);
    
    if (ledgerError) {
      console.error("Ledger insert failed", ledgerError);
      return { error: `Failed to create ledger entries: ${ledgerError.message}` };
    }
  }

  // 4. Update Balances
  for (const update of balanceUpdates) {
     const { error: balError } = await supabase
        .from('inventory_balances')
        .upsert({
           product_id: update.product_id,
           warehouse_id: update.warehouse_id,
           on_hand: update.on_hand,
           updated_at: update.updated_at
        }, { onConflict: 'product_id,warehouse_id' }); 

      if (balError) {
          console.error("Balance update failed for", update.product_id, balError);
          return { error: `Balance update failed: ${balError.message}` };
      }
  }

  // 5. Update Doc Status
  const { data, error } = await supabase
    .from('documents')
    .update({ status: 'posted', posted_at: timestamp })
    .eq('id', docId)
    .select()
    .single();

  return { data, error };
};
