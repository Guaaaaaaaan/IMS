import { supabase } from '../lib/supabaseClient';

export interface Product {
  id: string;
  sku_code: string;
  name: string;
  uom: string;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  image_urls: string[] | null;
  attributes: Record<string, string> | null;
  detail: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductFilter {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const listProducts = async ({ search, status, limit = 50, offset = 0 }: ProductFilter = {}) => {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('updated_at', { ascending: false });

  if (search) {
    query = query.or(`sku_code.ilike.%${search}%,name.ilike.%${search}%`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  return { data: data as Product[], error, count };
};

export const getProduct = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data: data as Product, error };
};

export const createProduct = async (payload: Partial<Product>) => {
  // Ensure strict match with DB columns. 
  // Exclude id (auto-gen), created_at (auto-gen), updated_at (auto-gen)
  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();
    
  return { data: data as Product, error };
};

export const updateProduct = async (id: string, payload: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
    
  return { data: data as Product, error };
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
    
  return { error };
};

// Debug utility
export const testSupabaseConnection = async () => {
  if (import.meta.env.DEV) {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    console.log('Supabase Debug:', { data, error });
    return { data, error };
  }
};
