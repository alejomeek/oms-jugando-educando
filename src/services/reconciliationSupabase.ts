import { createClient } from '@supabase/supabase-js';

// Cliente Supabase para el proyecto meli_reconciliation (base de datos separada)
export const reconSupabase = createClient(
  import.meta.env.VITE_RECON_SUPABASE_URL as string,
  import.meta.env.VITE_RECON_SUPABASE_KEY as string,
);
