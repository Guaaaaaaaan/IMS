import { supabase } from '../lib/supabaseClient';

export interface AuditLog {
  id: string;
  created_at: string;
  table_name: string;
  action: string;
  record_id: string;
  actor_email: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
}

export const listAuditLogs = async ({ 
  tableName, 
  action, 
  limit = 50 
}: { 
  tableName?: string; 
  action?: string; 
  limit?: number; 
} = {}) => {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tableName && tableName !== 'all') query = query.eq('table_name', tableName);
  if (action && action !== 'all') query = query.eq('action', action);

  const { data, error } = await query;
  return { data: data as AuditLog[], error };
};
