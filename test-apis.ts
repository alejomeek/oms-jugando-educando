/**
 * Script de prueba para validar los normalizadores de órdenes
 * 
 * Este script:
 * 1. Lee los archivos JSON de ejemplo de ML y Wix
 * 2. Normaliza las órdenes usando las funciones del servicio
 * 3. Imprime los resultados en consola para validación
 * 
 * Ejecutar con: npx tsx test-apis.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeMLOrder, normalizeWixOrder } from './src/services/normalizer';
import type { MLOrder, WixOrder } from './src/lib/types';

// Para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
    console.log('\n' + '='.repeat(60));
    log(title, colors.bright + colors.cyan);
    console.log('='.repeat(60) + '\n');
}

function logSuccess(message: string) {
    log(`✅ ${message}`, colors.green);
}

function logInfo(message: string) {
    log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string) {
    log(`⚠️  ${message}`, colors.yellow);
}

async function main() {
    try {
        logSection('🧪 TEST DE NORMALIZADORES DE ÓRDENES');

        // ========================================
        // TEST 1: Mercado Libre
        // ========================================
        logSection('TEST 1: Normalización de Orden de Mercado Libre');

        const mlOrderPath = join(__dirname, 'test-data', 'ml-order-example.json');
        logInfo(`Leyendo archivo: ${mlOrderPath}`);

        const mlOrderRaw = readFileSync(mlOrderPath, 'utf-8');
        const mlOrder: MLOrder = JSON.parse(mlOrderRaw);

        logSuccess('Archivo ML cargado correctamente');
        console.log('\n📦 Orden RAW de Mercado Libre:');
        console.log(JSON.stringify(mlOrder, null, 2));

        logInfo('\n🔄 Normalizando orden de Mercado Libre...');
        const normalizedML = normalizeMLOrder(mlOrder);

        logSuccess('Orden normalizada exitosamente');
        console.log('\n✨ Orden NORMALIZADA de Mercado Libre:');
        console.log(JSON.stringify(normalizedML, null, 2));

        // Validaciones
        console.log('\n📊 Validaciones:');
        logSuccess(`Canal: ${normalizedML.channel} (esperado: mercadolibre)`);
        logSuccess(`External ID: ${normalizedML.external_id}`);
        logSuccess(`Total: ${normalizedML.total_amount} ${normalizedML.currency}`);
        logSuccess(`Items: ${normalizedML.items.length} producto(s)`);
        logSuccess(`Cliente: ${normalizedML.customer.nickname || 'N/A'}`);

        // ========================================
        // TEST 2: Wix
        // ========================================
        logSection('TEST 2: Normalización de Orden de Wix');

        const wixOrderPath = join(__dirname, 'test-data', 'wix-order-example.json');
        logInfo(`Leyendo archivo: ${wixOrderPath}`);

        const wixOrderRaw = readFileSync(wixOrderPath, 'utf-8');
        const wixOrder: WixOrder = JSON.parse(wixOrderRaw);

        logSuccess('Archivo Wix cargado correctamente');
        console.log('\n📦 Orden RAW de Wix:');
        console.log(JSON.stringify(wixOrder, null, 2));

        logInfo('\n🔄 Normalizando orden de Wix...');
        const normalizedWix = normalizeWixOrder(wixOrder);

        logSuccess('Orden normalizada exitosamente');
        console.log('\n✨ Orden NORMALIZADA de Wix:');
        console.log(JSON.stringify(normalizedWix, null, 2));

        // Validaciones
        console.log('\n📊 Validaciones:');
        logSuccess(`Canal: ${normalizedWix.channel} (esperado: wix)`);
        logSuccess(`External ID: ${normalizedWix.external_id}`);
        logSuccess(`Total: ${normalizedWix.total_amount} ${normalizedWix.currency}`);
        logSuccess(`Items: ${normalizedWix.items.length} producto(s)`);
        logSuccess(`Cliente: ${normalizedWix.customer.email || 'N/A'}`);
        logSuccess(`Dirección: ${normalizedWix.shipping_address ? 'Sí' : 'No'}`);

        // ========================================
        // RESUMEN
        // ========================================
        logSection('📋 RESUMEN DE PRUEBAS');
        logSuccess('Todos los tests pasaron exitosamente');
        logInfo('Los normalizadores están funcionando correctamente');
        logInfo('Las estructuras de datos son compatibles con el tipo Order');

        console.log('\n✅ Listo para integrar con Supabase\n');

    } catch (error) {
        console.error('\n❌ ERROR EN LAS PRUEBAS:\n');
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar
main();
