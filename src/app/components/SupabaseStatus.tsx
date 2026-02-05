import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Status = 'checking' | 'connected' | 'configured' | 'not-configured';

export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    async function checkConnection() {
      // 1. Check if configured
      // We assume configured if the client has a URL and Key.
      // Accessing internal properties is the only way to know the *resolved* config
      // (env vs window vs system).
      const clientUrl = (supabase as any).supabaseUrl;
      const clientKey = (supabase as any).supabaseKey;

      if (!clientUrl || !clientKey) {
        setStatus('not-configured');
        return;
      }

      // 2. Test connection
      try {
        // Use a lightweight query
        const { error } = await supabase.from('products').select('id').limit(1).maybeSingle();
        
        if (!error) {
          setStatus('connected');
        } else {
          // If we get an error (RLS, network, etc), we are configured but connection/query failed
          // The requirements say to treat RLS/permissions as "Configured"
          setStatus('configured');
        }
      } catch (err) {
        // Network errors or other exceptions
        setStatus('configured');
      }
    }

    checkConnection();
  }, []);

  if (status === 'checking') {
    // Render a neutral state while checking, same as configured but maybe pulse?
    // Or just render nothing to avoid flicker? 
    // "The status must be computed at runtime" -> Rendering "Configured" initially is safe.
    return (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium bg-zinc-50 text-zinc-500 border-zinc-200">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            <span className="hidden sm:inline">Supabase:</span>
            <span>Checking...</span>
        </div>
    );
  }

  const styles = {
    'connected': {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Connected'
    },
    'configured': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      label: 'Configured'
    },
    'not-configured': {
      bg: 'bg-zinc-100',
      text: 'text-zinc-500',
      border: 'border-zinc-200',
      dot: 'bg-zinc-400',
      label: 'Not Configured'
    },
    'checking': { // Fallback
      bg: 'bg-zinc-50',
      text: 'text-zinc-500',
      border: 'border-zinc-200',
      dot: 'bg-zinc-400',
      label: 'Checking...'
    }
  };

  const style = styles[status];

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${style.bg} ${style.text} ${style.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="hidden sm:inline">Supabase:</span>
      <span>{style.label}</span>
    </div>
  );
}
