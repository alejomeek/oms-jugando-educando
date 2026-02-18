import { createClient } from '@supabase/supabase-js';

// Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables de entorno existan
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local'
  );
}

/**
 * Cliente de Supabase configurado
 * Usa las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
 *
 * @example
 * import { supabase } from '@/services/supabase';
 *
 * // Query
 * const { data, error } = await supabase.from('orders').select('*');
 *
 * // Insert
 * const { error } = await supabase.from('orders').insert([...]);
 *
 * // Update
 * const { error } = await supabase.from('orders').update({ status: 'preparando' }).eq('id', orderId);
 *
 * NOTA: Para tipado estricto, genera los tipos con:
 * npx supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
 * Luego importa y usa: createClient<Database>(url, key)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
