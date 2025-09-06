#!/usr/bin/env node

import sharp from 'sharp';
import toIco from 'to-ico';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const inputSvg = join(publicDir, 'dot.svg');

console.log('🎨 Generando iconos desde dot.svg...');

try {
  // Verificar que el archivo SVG existe
  await fs.access(inputSvg);
  
  const svgBuffer = await fs.readFile(inputSvg);
  
  // Generar diferentes tamaños PNG
  const sizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'android-chrome-192x192.png' },
    { size: 512, name: 'android-chrome-512x512.png' }
  ];

  console.log('📦 Generando PNGs...');
  
  const pngBuffers = [];
  
  for (const { size, name } of sizes) {
    console.log(`  ├─ ${name} (${size}×${size})`);
    
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 95, compressionLevel: 9 })
      .toBuffer();
      
    await fs.writeFile(join(publicDir, name), pngBuffer);
    
    // Almacenar buffers para favicon.ico
    if (size === 16 || size === 32) {
      pngBuffers.push(pngBuffer);
    }
  }

  // Generar favicon.ico multi-resolución
  console.log('🌟 Generando favicon.ico...');
  
  // Agregar tamaño 48x48 para el ICO
  const png48 = await sharp(svgBuffer)
    .resize(48, 48)
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
  
  pngBuffers.push(png48);
  
  const icoBuffer = await toIco(pngBuffers);
  await fs.writeFile(join(publicDir, 'favicon.ico'), icoBuffer);
  
  console.log('✅ Todos los iconos generados exitosamente:');
  console.log('  ├─ favicon-16x16.png');
  console.log('  ├─ favicon-32x32.png'); 
  console.log('  ├─ apple-touch-icon.png');
  console.log('  ├─ android-chrome-192x192.png');
  console.log('  ├─ android-chrome-512x512.png');
  console.log('  └─ favicon.ico (multi-resolución: 16, 32, 48)');
  
  // Verificar tamaños de archivos
  console.log('\n📊 Tamaños de archivos:');
  for (const { name } of sizes) {
    const stat = await fs.stat(join(publicDir, name));
    const sizeKB = (stat.size / 1024).toFixed(1);
    console.log(`  ├─ ${name}: ${sizeKB} KB`);
  }
  
  const icoStat = await fs.stat(join(publicDir, 'favicon.ico'));
  const icoSizeKB = (icoStat.size / 1024).toFixed(1);
  console.log(`  └─ favicon.ico: ${icoSizeKB} KB`);

} catch (error) {
  console.error('❌ Error generando iconos:', error.message);
  process.exit(1);
}