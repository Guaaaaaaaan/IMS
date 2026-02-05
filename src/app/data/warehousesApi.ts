import { supabase } from '../lib/supabaseClient';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  status: string;
  created_at?: string;
}

export const listWarehouses = async () => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .order('name');
  return { data: data as Warehouse[], error };
};

export const getWarehouse = async (id: string) => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Warehouse, error };
};

export const createWarehouse = async (name: string, code: string, status: string = 'active') => {
  const { data, error } = await supabase
    .from('warehouses')
    .insert([{ name, code, status }])
    .select()
    .single();
  return { data: data as Warehouse, error };
};

export const updateWarehouse = async (id: string, name: string, code?: string, status?: string) => {
  const updates: any = { name };
  if (code) updates.code = code;
  if (status) updates.status = status;

  const { data, error } = await supabase
    .from('warehouses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data: data as Warehouse, error };
};

export const deleteWarehouse = async (id: string) => {
  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', id);
  return { error };
};
