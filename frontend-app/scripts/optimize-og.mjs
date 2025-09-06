#!/usr/bin/env node

import sharp from 'sharp';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const ogPath = join(publicDir, 'og.jpg');

console.log('🖼️  Optimizando OG image...');

try {
  const originalStat = await fs.stat(ogPath);
  const originalSizeKB = (originalStat.size / 1024).toFixed(1);
  console.log(`📊 Tamaño original: ${originalSizeKB} KB`);

  await sharp(ogPath)
    .resize(1200, 630, { 
      fit: 'cover',
      position: 'center' 
    })
    .jpeg({ 
      quality: 85, 
      progressive: true,
      mozjpeg: true 
    })
    .toFile(join(publicDir, 'og-optimized.jpg'));

  // Replace original with optimized
  await fs.rename(join(publicDir, 'og-optimized.jpg'), ogPath);
  
  const newStat = await fs.stat(ogPath);
  const newSizeKB = (newStat.size / 1024).toFixed(1);
  const savings = ((originalStat.size - newStat.size) / originalStat.size * 100).toFixed(1);
  
  console.log(`✅ Optimizado: ${newSizeKB} KB (${savings}% reducción)`);
  
  if (newStat.size > 600 * 1024) {
    console.log('⚠️  Imagen aún supera los 600 KB recomendados');
  } else {
    console.log('🎯 Tamaño objetivo alcanzado (≤ 600 KB)');
  }

} catch (error) {
  console.error('❌ Error optimizando imagen:', error.message);
  process.exit(1);
}