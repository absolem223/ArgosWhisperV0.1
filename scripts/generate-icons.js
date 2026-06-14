/**
 * scripts/generate-icons.js
 * Genera todas las variantes de íconos a partir de assets/logo.png (fuente maestra).
 * Requiere: npm install -D sharp  (o pnpm add -D sharp)
 *
 * Uso:
 *   node scripts/generate-icons.js
 *
 * Genera:
 *   assets/icon-512.png  — 512x512 png
 *   assets/favicon.png   — 32x32 png
 *   assets/icon.ico      — Ícono Windows multi-resolución (256/64/48/32/16)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(PROJECT_ROOT, 'assets', 'logo.png');
const OUT = path.join(PROJECT_ROOT, 'assets');

if (!fs.existsSync(SRC)) {
  console.error('ERROR: assets/logo.png no encontrado. Copiá la imagen original ahí primero.');
  process.exit(1);
}

async function run() {
  // icon-512.png
  await sharp(SRC)
    .resize(512, 512, { fit: 'contain', background: { r: 10, g: 13, b: 26, alpha: 1 } })
    .png()
    .toFile(path.join(OUT, 'icon-512.png'));
  console.log('✔ assets/icon-512.png generado');

  // favicon.png (32x32)
  await sharp(SRC)
    .resize(32, 32, { fit: 'contain', background: { r: 10, g: 13, b: 26, alpha: 1 } })
    .png()
    .toFile(path.join(OUT, 'favicon.png'));
  console.log('✔ assets/favicon.png generado');

  // Para .ico necesitamos png2ico o toIco
  // Intentamos con `to-ico` si está disponible, sino instrucciones manuales
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const toIco = require('to-ico');

    const sizes = [256, 64, 48, 32, 16];
    const buffers = await Promise.all(
      sizes.map((size) =>
        sharp(SRC)
          .resize(size, size, { fit: 'contain', background: { r: 10, g: 13, b: 26, alpha: 1 } })
          .png()
          .toBuffer()
      )
    );

    const icoBuffer = await toIco(buffers);
    fs.writeFileSync(path.join(OUT, 'icon.ico'), icoBuffer);
    console.log('✔ assets/icon.ico generado (multi-resolución: 256/64/48/32/16)');
  } catch {
    console.warn('⚠ to-ico no disponible. Instalá con: pnpm add -D to-ico');
    console.warn('  Luego ejecuta de nuevo: node scripts/generate-icons.js');
    console.warn('');
    console.warn('  Alternativa manual: convertí assets/icon-512.png a .ico con:');
    console.warn('  https://convertio.co/png-ico/ o IcoFX');
  }

  console.log('\n✅ Íconos generados en assets/');
}

run().catch((err) => {
  console.error('Error generando íconos:', err);
  process.exit(1);
});
