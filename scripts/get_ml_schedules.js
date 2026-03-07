/**
 * Diagnóstico de horarios de Colecta (cross_docking) por API de Mercado Libre
 *
 * Muestra:
 *  1. Horario completo de la semana (solo slots COXBG1 = Bogotá)
 *  2. Slots de hoy con estado (vencido / próximo / futuro)
 *  3. Estructura cruda de un slot (campos disponibles vs. vacíos)
 *  4. Lo que NO puede saberse por API (nodo por tienda)
 *
 * Uso: node scripts/get_ml_schedules.js
 */

import fs from 'fs';
import path from 'path';

// ── Config ─────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
    .filter(([k]) => k)
);

let accessToken = env.VITE_ML_ACCESS_TOKEN;
const sellerId  = env.VITE_ML_SELLER_ID;

const DAYS_ES = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TODAY_KEY = DAYS_ORDER[new Date(Date.now() - 5 * 3600 * 1000).getUTCDay() === 0 ? 6 : new Date(Date.now() - 5 * 3600 * 1000).getUTCDay() - 1];
// Bogotá = UTC-5
const bogotaDate = new Date(Date.now() - 5 * 3600 * 1000);
const NOW_HHmm   = `${String(bogotaDate.getUTCHours()).padStart(2, '0')}:${String(bogotaDate.getUTCMinutes()).padStart(2, '0')}`;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function refreshToken() {
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     env.VITE_ML_CLIENT_ID,
      client_secret: env.VITE_ML_CLIENT_SECRET,
      refresh_token: env.VITE_ML_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) { console.error('Error refresh token:', await res.text()); process.exit(1); }
  accessToken = (await res.json()).access_token;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) { await refreshToken(); return fetchJson(url); }
  if (!res.ok) return null;
  return res.json();
}

function slotState(cutoff) {
  if (cutoff > NOW_HHmm) return '🟢 ACTIVO   ';
  return '🔴 VENCIDO  ';
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  await refreshToken();

  const data = await fetchJson(
    `https://api.mercadolibre.com/users/${sellerId}/shipping/schedule/cross_docking`
  );

  if (!data?.schedule) {
    console.log('Sin horario disponible.');
    return;
  }

  // ── 1. Horario semanal ────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║        HORARIO SEMANAL DE COLECTA — BOGOTÁ           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  for (const day of DAYS_ORDER) {
    const info = data.schedule[day];
    const slots = info?.detail?.filter(s => s.facility_id === 'COXBG1') ?? [];
    const marker = day === TODAY_KEY ? ' ◀ HOY' : '';
    console.log(`  ${DAYS_ES[day]}${marker}`);
    if (!info?.work || slots.length === 0) {
      console.log('    Sin colecta programada.\n');
      continue;
    }
    for (const s of slots) {
      console.log(`    Colecta: ${s.from}–${s.to}   Cutoff: ${s.cutoff}`);
    }
    console.log();
  }

  // ── 2. Slots de hoy ───────────────────────────────────────────────────────

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log(`║  SLOTS DE HOY (${DAYS_ES[TODAY_KEY].toUpperCase()})  —  Hora Bogotá: ${NOW_HHmm}              ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const todaySlots = data.schedule[TODAY_KEY]?.detail?.filter(s => s.facility_id === 'COXBG1') ?? [];

  if (todaySlots.length === 0) {
    console.log('  Sin slots hoy.\n');
  } else {
    for (let i = 0; i < todaySlots.length; i++) {
      const s = todaySlots[i];
      const state = slotState(s.cutoff);
      console.log(`  Slot ${i + 1}  ${state}  Colecta: ${s.from}–${s.to}   Cutoff: ${s.cutoff}`);
    }

    const next = todaySlots.find(s => s.cutoff > NOW_HHmm);
    console.log(next
      ? `\n  ➤ Próximo slot: Colecta entre ${next.from} y ${next.to}  (cutoff ${next.cutoff})`
      : '\n  ➤ Todos los slots de hoy han vencido.'
    );
  }

  // ── 3. Estructura cruda de un slot ────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║        ESTRUCTURA CRUDA DE UN SLOT (raw API)         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const sample = todaySlots[0] ?? data.schedule[DAYS_ORDER.find(d => data.schedule[d]?.work)]?.detail?.[0];
  if (sample) {
    for (const [key, val] of Object.entries(sample)) {
      const display = typeof val === 'object' ? JSON.stringify(val) : val;
      const empty   = display === '""' || display === '{}' || display === 'false' || display === '';
      const tag     = empty ? '  (vacío)' : '';
      console.log(`  ${key.padEnd(20)} → ${display}${tag}`);
    }
  }

  // ── 4. Lo que NO podemos saber ────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║           LO QUE NO EXPONE LA API                    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log('  ✗ node_id por slot   → los 3 slots COXBG1 no llevan identificador de tienda');
  console.log('  ✗ /nodes/{id}/schedule/cross_docking  → 404');
  console.log('  ✗ ?node_id= param    → ignorado, devuelve los mismos 4 slots');
  console.log('  ✗ carrier / driver / vehicle           → siempre vacíos');
  console.log('\n  Los 3 slots de Bogotá corresponden a BULEVAR, AVENIDA 19 y CEDI');
  console.log('  pero la API no indica cuál es cuál.\n');
}

run();
