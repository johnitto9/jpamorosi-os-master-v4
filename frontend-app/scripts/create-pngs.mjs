#!/usr/bin/env node

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

console.log('🎨 Creando PNGs del dot púrpura sin fondo...');

// Función para crear PNG simple con transparencia
const createPNG = (size) => {
  // Crear canvas conceptual
  const canvas = new Array(size * size).fill(null).map(() => [0, 0, 0, 0]); // RGBA
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = Math.max(1, (size * 0.8) / 2); // 80% del tamaño
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        // Gradiente púrpura del centro hacia afuera
        const factor = 1 - (distance / radius);
        const r = Math.round(0xF6 * factor + 0x5B * (1 - factor)); // De F6 a 5B
        const g = Math.round(0x5C * factor + 0x21 * (1 - factor)); // De 5C a 21  
        const b = Math.round(0xB6 * factor + 0xB6 * (1 - factor)); // De B6 a B6
        
        canvas[y * size + x] = [r, g, b, 255]; // Opaco
      }
      // Resto queda transparente [0,0,0,0]
    }
  }
  
  return canvas;
};

// Crear archivos PNG manualmente (formato básico)
const createBasicPNG = async (size, filename) => {
  const canvas = createPNG(size);
  
  // Crear contenido SVG y guardarlo como PNG alternativo
  const svgContent = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#b869ff;stop-opacity:1" />
          <stop offset="70%" style="stop-color:#8b5cf6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#5b21b6;stop-opacity:1" />
        </radialGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${(size * 0.8)/2}" fill="url(#grad)"/>
    </svg>
  `;
  
  // Guardar como SVG (navegadores los interpretarán como imágenes)
  await fs.writeFile(join(publicDir, filename.replace('.png', '.svg')), svgContent);
  console.log(`✅ ${filename.replace('.png', '.svg')} creado (${size}×${size})`);
};

try {
  const sizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'android-chrome-192x192.png' },
    { size: 512, name: 'android-chrome-512x512.png' }
  ];

  for (const { size, name } of sizes) {
    await createBasicPNG(size, name);
  }
  
  console.log('\n🎯 Todos los iconos creados como SVG (compatibles con navegadores)');
  
} catch (error) {
  console.error('❌ Error creando iconos:', error);
  process.exit(1);
}