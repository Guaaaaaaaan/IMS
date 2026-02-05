import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// ------------------------------------------------------------------
// Configuration & Environment Variables
// ------------------------------------------------------------------

// 1. Try Vite environment variables (standard)
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Try window.__ENV__ injection (fallback for specific Figma Make setups)
const windowEnv = (window as any).__ENV__ || {};
const winUrl = windowEnv.VITE_SUPABASE_URL;
const winKey = windowEnv.VITE_SUPABASE_ANON_KEY;

// 3. Fallback to system-provided configuration (Figma Make default)
const systemUrl = `https://${projectId}.supabase.co`;
const systemKey = publicAnonKey;

// Select the best available configuration
const supabaseUrl = envUrl || winUrl || systemUrl;
const supabaseKey = envKey || winKey || systemKey;

// ------------------------------------------------------------------
// Diagnostics
// ------------------------------------------------------------------

const isDev = import.meta.env.DEV;

if (isDev) {
  console.group("Supabase Configuration Check");
  console.log("VITE_SUPABASE_URL defined:", !!envUrl);
  console.log("VITE_SUPABASE_ANON_KEY defined:", !!envKey);
  console.log("window.__ENV__ fallback used:", !!(winUrl || winKey));
  console.log("System fallback used:", !envUrl && !winUrl);
  console.groupEnd();

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "CRITICAL: Supabase URL or Anon Key is missing.\n" +
      "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your project settings."
    );
  }
}

// ------------------------------------------------------------------
// Client Initialization
// ------------------------------------------------------------------

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);


// ------------------------------------------------------------------
// Connection Verification
// ------------------------------------------------------------------

if (isDev && supabaseUrl && supabaseKey) {
  (async () => {
    try {
      const { data, error } = await supabase.from("products").select("*").limit(1);
      if (error) {
        console.error("Supabase connection test failed:", error);
      } else {
        console.log("Supabase connection test success:", { data });
      }
    } catch (err) {
      console.error("Supabase connection test exception:", err);
    }
  })();
}
