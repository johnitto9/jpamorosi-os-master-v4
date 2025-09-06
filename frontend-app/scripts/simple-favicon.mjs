#!/usr/bin/env node

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

console.log('🎯 Creando favicon.ico simple...');

// Crear un simple favicon.ico con datos binarios básicos
const createSimpleFavicon = () => {
  // Datos para un favicon.ico 16x16 básico (formato ICO)
  // Header ICO (6 bytes) + Directorio (16 bytes) + Bitmap (318 bytes)
  const header = Buffer.from([
    0x00, 0x00, // Reserved
    0x01, 0x00, // Type: 1 = ICO
    0x01, 0x00  // Count: 1 image
  ]);
  
  const directory = Buffer.from([
    0x10,       // Width: 16px
    0x10,       // Height: 16px  
    0x00,       // Colors: 0 = 256 colors
    0x00,       // Reserved
    0x01, 0x00, // Planes: 1
    0x20, 0x00, // Bits per pixel: 32
    0x00, 0x01, 0x00, 0x00, // Size: 256 bytes
    0x16, 0x00, 0x00, 0x00  // Offset: 22 bytes
  ]);
  
  // Crear bitmap 16x16 con un círculo púrpura simple
  const bitmapHeader = Buffer.alloc(40);
  bitmapHeader.writeUInt32LE(40, 0);     // Header size
  bitmapHeader.writeUInt32LE(16, 4);     // Width
  bitmapHeader.writeUInt32LE(32, 8);     // Height (16*2 for AND mask)
  bitmapHeader.writeUInt16LE(1, 12);     // Planes
  bitmapHeader.writeUInt16LE(32, 14);    // Bits per pixel
  bitmapHeader.writeUInt32LE(0, 16);     // Compression
  bitmapHeader.writeUInt32LE(256, 20);   // Image size
  
  // Crear pixels 16x16 BGRA
  const pixels = Buffer.alloc(16 * 16 * 4);
  
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - 8;
      const dy = y - 8;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const offset = (y * 16 + x) * 4;
      
      if (distance <= 7) {
        // Púrpura más grande y sin fondo
        pixels[offset] = 0xB6;     // B
        pixels[offset + 1] = 0x5C; // G  
        pixels[offset + 2] = 0xF6; // R
        pixels[offset + 3] = 0xFF; // A
      } else {
        // Completamente transparente (sin fondo)
        pixels[offset] = 0x00;     // B
        pixels[offset + 1] = 0x00; // G
        pixels[offset + 2] = 0x00; // R
        pixels[offset + 3] = 0x00; // A (transparente)
      }
    }
  }
  
  // AND mask (todos transparentes)
  const andMask = Buffer.alloc(16 * 16 / 8);
  
  return Buffer.concat([header, directory, bitmapHeader, pixels, andMask]);
};

try {
  const faviconData = createSimpleFavicon();
  await fs.writeFile(join(publicDir, 'favicon.ico'), faviconData);
  
  console.log('✅ favicon.ico creado exitosamente');
  console.log(`📊 Tamaño: ${(faviconData.length / 1024).toFixed(1)} KB`);
  
} catch (error) {
  console.error('❌ Error creando favicon:', error);
  process.exit(1);
}