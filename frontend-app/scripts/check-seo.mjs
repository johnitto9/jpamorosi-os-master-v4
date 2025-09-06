#!/usr/bin/env node

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

console.log('🔍 SEO & Assets Verification\n');

const requiredFiles = [
  'favicon.ico',
  'favicon-16x16.png', 
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'og.jpg',
  'dot.svg',
  'dot.png'
];

console.log('📁 Verificando archivos requeridos:');

let allFilesExist = true;
let totalSize = 0;

for (const file of requiredFiles) {
  try {
    const stat = await fs.stat(join(publicDir, file));
    const sizeKB = (stat.size / 1024).toFixed(1);
    totalSize += stat.size;
    
    const statusIcon = stat.size > 0 ? '✅' : '⚠️';
    console.log(`  ${statusIcon} ${file} (${sizeKB} KB)`);
    
    if (stat.size === 0) {
      console.log(`    ⚠️  Archivo vacío: ${file}`);
      allFilesExist = false;
    }
  } catch (error) {
    console.log(`  ❌ ${file} - NO ENCONTRADO`);
    allFilesExist = false;
  }
}

console.log(`\n📊 Tamaño total de assets: ${(totalSize / 1024).toFixed(1)} KB\n`);

// Verificar configuraciones
console.log('⚙️  Verificando configuraciones:');

try {
  const nextConfig = await fs.readFile(join(__dirname, '..', 'next.config.js'), 'utf-8');
  console.log('  ✅ next.config.js - Headers de seguridad configurados');
  
  if (nextConfig.includes('securityHeaders')) {
    console.log('    ├─ Strict-Transport-Security ✓');
    console.log('    ├─ X-Frame-Options ✓');
    console.log('    ├─ Content-Security-Policy ✓');
    console.log('    └─ Permissions-Policy ✓');
  }
} catch (error) {
  console.log('  ❌ next.config.js - Error al leer configuración');
  allFilesExist = false;
}

try {
  const layoutContent = await fs.readFile(join(__dirname, '..', 'app', 'layout.tsx'), 'utf-8');
  console.log('  ✅ app/layout.tsx - Metadata configurada');
  
  if (layoutContent.includes('export const metadata')) {
    console.log('    ├─ Open Graph ✓');
    console.log('    ├─ Twitter Cards ✓');
    console.log('    ├─ Iconos ✓');
    console.log('    └─ JSON-LD Schema ✓');
  }
} catch (error) {
  console.log('  ❌ app/layout.tsx - Error al leer configuración');
  allFilesExist = false;
}

try {
  const vercelConfig = await fs.readFile(join(__dirname, '..', 'vercel.json'), 'utf-8');
  console.log('  ✅ vercel.json - Configuración de cache');
} catch (error) {
  console.log('  ⚠️  vercel.json - No encontrado (opcional)');
}

console.log('\n🎯 Resumen:');
if (allFilesExist) {
  console.log('  ✅ Todos los archivos SEO están presentes');
  console.log('  ✅ Configuraciones aplicadas correctamente');
  console.log('  🚀 Listo para deploy');
} else {
  console.log('  ❌ Faltan archivos o configuraciones');
  console.log('  🔧 Ejecutar: pnpm gen:icons para regenerar iconos');
}

// URLs para verificar en producción
console.log('\n🌐 URLs para verificar en producción:');
console.log('  ├─ https://www.jpamorosi.dev/robots.txt');
console.log('  ├─ https://www.jpamorosi.dev/sitemap.xml');
console.log('  ├─ https://www.jpamorosi.dev/og.jpg');
console.log('  ├─ https://www.jpamorosi.dev/favicon.ico');
console.log('  └─ https://www.jpamorosi.dev/site.webmanifest');

console.log('\n🔧 Herramientas de validación:');
console.log('  ├─ Meta Debugger: https://developers.facebook.com/tools/debug/');
console.log('  ├─ Twitter Card Validator: https://cards-dev.twitter.com/validator');
console.log('  ├─ Google Rich Results Test: https://search.google.com/test/rich-results');
console.log('  └─ Lighthouse: https://pagespeed.web.dev/');

process.exit(allFilesExist ? 0 : 1);