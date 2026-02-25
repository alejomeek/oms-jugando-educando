import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_RECON_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_RECON_SUPABASE_KEY as string | undefined;

/**
 * Cliente Supabase de meli_reconciliation (DB separado).
 * Es `null` si las variables de entorno no están configuradas.
 */
export const reconSupabase = url && key ? createClient(url, key) : null;
