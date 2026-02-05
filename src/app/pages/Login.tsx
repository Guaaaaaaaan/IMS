import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPassword } from '../data/authApi';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setInitializing(false);
    }, 2500);

    (async () => {
      try {
        localStorage.clear();
      } catch (err) {
        console.error('Login cleanup localStorage clear failed:', err);
      }
      // Best-effort sign out; do not block login screen
      void supabase.auth.signOut().catch((err) => {
        console.error('Login cleanup signOut failed:', err);
      });
      if (!cancelled) setInitializing(false);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signInWithPassword(email, password);

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg border border-zinc-200 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center text-white mx-auto mb-4">
            <span className="font-bold text-xl">IMS</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Sign in to your account</h1>
          <p className="text-zinc-500 mt-2">Enter your credentials to access the admin panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email address</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || initializing}>
            {initializing ? 'Preparing login...' : (loading ? 'Signing in...' : 'Sign in')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          <p>Don't have an account? Contact your administrator.</p>
        </div>
      </div>
    </div>
  );
}
