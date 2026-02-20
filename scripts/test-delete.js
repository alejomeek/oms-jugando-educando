import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
        .filter(([k]) => k)
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
    // Borrar órdenes de los últimos 3 días para garantizar que haya algo que probar y sincronizar
    const d = new Date();
    d.setDate(d.getDate() - 3);

    console.log('Borrando órdenes con order_date >=', d.toISOString().split('T')[0]);

    const { error, count } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .gte('order_date', d.toISOString());

    if (error) console.error('Error:', error.message);
    else console.log('✅ Borradas ' + count + ' ordenes recientes.');
}

main();
