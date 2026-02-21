import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente lazy: se crea la primera vez que se usa, no al importar el módulo.
// Evita el crash "supabaseUrl is required" cuando las vars no están configuradas.
let _client: SupabaseClient | null = null;

export function getReconSupabase(): SupabaseClient {
  if (!_client) {
    const url = import.meta.env.VITE_RECON_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_RECON_SUPABASE_KEY as string | undefined;
    if (!url || !key) {
      throw new Error(
        'VITE_RECON_SUPABASE_URL y VITE_RECON_SUPABASE_KEY deben estar configurados en las variables de entorno de Vercel',
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}
