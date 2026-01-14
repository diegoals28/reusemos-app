/**
 * Script para generar assets para Reusa
 * Uso: node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Colores de la marca
const BRAND_GREEN = '#2D9B6E';
const BRAND_GREEN_DARK = '#1E7A53';
const BRAND_GREEN_LIGHT = '#4DB88A';
const WHITE = '#FFFFFF';
const ACCENT = '#FF6B4A';

// SVG del icono principal de Reusa - Hoja con flecha circular (simboliza reuso)
const createMainIconSVG = (size, withBackground = true) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo -->
  ${withBackground ? `<rect width="512" height="512" rx="102" fill="${BRAND_GREEN}"/>` : ''}

  <!-- Círculo de fondo para el símbolo -->
  <circle cx="256" cy="256" r="180" fill="${withBackground ? BRAND_GREEN_DARK : BRAND_GREEN}" opacity="0.3"/>

  <!-- Flecha circular (símbolo de reuso) -->
  <g transform="translate(256, 256)">
    <!-- Arco superior -->
    <path d="M -80 -100
             A 130 130 0 0 1 100 -60"
          stroke="${WHITE}"
          stroke-width="28"
          stroke-linecap="round"
          fill="none"/>
    <!-- Punta de flecha superior -->
    <polygon points="95,-85 125,-55 85,-45" fill="${WHITE}"/>

    <!-- Arco inferior -->
    <path d="M 80 100
             A 130 130 0 0 1 -100 60"
          stroke="${WHITE}"
          stroke-width="28"
          stroke-linecap="round"
          fill="none"/>
    <!-- Punta de flecha inferior -->
    <polygon points="-95,85 -125,55 -85,45" fill="${WHITE}"/>
  </g>

  <!-- Hoja central -->
  <g transform="translate(256, 256)">
    <path d="M 0 -70
             Q 50 -30, 45 30
             Q 35 70, 0 85
             Q -35 70, -45 30
             Q -50 -30, 0 -70 Z"
          fill="${WHITE}"/>
    <!-- Línea central de la hoja -->
    <path d="M 0 -50 Q 5 0, 0 65"
          stroke="${BRAND_GREEN}"
          stroke-width="8"
          stroke-linecap="round"
          fill="none"/>
    <!-- Venas de la hoja -->
    <path d="M 0 -20 Q 20 -10, 28 10"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
    <path d="M 0 -20 Q -20 -10, -28 10"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
    <path d="M 0 20 Q 15 25, 22 40"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
    <path d="M 0 20 Q -15 25, -22 40"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
  </g>
</svg>
`;

// SVG para el icono adaptativo de Android (solo foreground, sin fondo)
const createAdaptiveIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Flecha circular (símbolo de reuso) -->
  <g transform="translate(256, 256)">
    <!-- Arco superior -->
    <path d="M -80 -100
             A 130 130 0 0 1 100 -60"
          stroke="${WHITE}"
          stroke-width="28"
          stroke-linecap="round"
          fill="none"/>
    <!-- Punta de flecha superior -->
    <polygon points="95,-85 125,-55 85,-45" fill="${WHITE}"/>

    <!-- Arco inferior -->
    <path d="M 80 100
             A 130 130 0 0 1 -100 60"
          stroke="${WHITE}"
          stroke-width="28"
          stroke-linecap="round"
          fill="none"/>
    <!-- Punta de flecha inferior -->
    <polygon points="-95,85 -125,55 -85,45" fill="${WHITE}"/>
  </g>

  <!-- Hoja central -->
  <g transform="translate(256, 256)">
    <path d="M 0 -70
             Q 50 -30, 45 30
             Q 35 70, 0 85
             Q -35 70, -45 30
             Q -50 -30, 0 -70 Z"
          fill="${WHITE}"/>
    <!-- Línea central de la hoja -->
    <path d="M 0 -50 Q 5 0, 0 65"
          stroke="${BRAND_GREEN}"
          stroke-width="8"
          stroke-linecap="round"
          fill="none"/>
    <!-- Venas de la hoja -->
    <path d="M 0 -20 Q 20 -10, 28 10"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
    <path d="M 0 -20 Q -20 -10, -28 10"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
    <path d="M 0 20 Q 15 25, 22 40"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
    <path d="M 0 20 Q -15 25, -22 40"
          stroke="${BRAND_GREEN}"
          stroke-width="5"
          stroke-linecap="round"
          fill="none"/>
  </g>
</svg>
`;

// SVG para splash screen
const createSplashSVG = (width, height) => `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo verde -->
  <rect width="100%" height="100%" fill="${BRAND_GREEN}"/>

  <!-- Patrón sutil de fondo -->
  <defs>
    <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="2" fill="${WHITE}" opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#dots)"/>

  <!-- Logo centrado -->
  <g transform="translate(${width/2 - 100}, ${height/2 - 140})">
    <!-- Flecha circular -->
    <g transform="translate(100, 100)">
      <path d="M -50 -65 A 85 85 0 0 1 65 -40"
            stroke="${WHITE}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <polygon points="62,-58 82,-38 55,-32" fill="${WHITE}"/>
      <path d="M 50 65 A 85 85 0 0 1 -65 40"
            stroke="${WHITE}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <polygon points="-62,58 -82,38 -55,32" fill="${WHITE}"/>
    </g>

    <!-- Hoja -->
    <g transform="translate(100, 100)">
      <path d="M 0 -45 Q 32 -20, 29 20 Q 22 45, 0 55 Q -22 45, -29 20 Q -32 -20, 0 -45 Z" fill="${WHITE}"/>
      <path d="M 0 -32 Q 3 0, 0 42" stroke="${BRAND_GREEN}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M 0 -12 Q 13 -6, 18 7" stroke="${BRAND_GREEN}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M 0 -12 Q -13 -6, -18 7" stroke="${BRAND_GREEN}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M 0 13 Q 10 16, 14 26" stroke="${BRAND_GREEN}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M 0 13 Q -10 16, -14 26" stroke="${BRAND_GREEN}" stroke-width="3" stroke-linecap="round" fill="none"/>
    </g>
  </g>

  <!-- Texto "Reusa" -->
  <text x="${width/2}" y="${height/2 + 100}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="48"
        font-weight="bold"
        fill="${WHITE}"
        text-anchor="middle">Reusa</text>

  <!-- Slogan -->
  <text x="${width/2}" y="${height/2 + 145}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="20"
        fill="${WHITE}"
        opacity="0.9"
        text-anchor="middle">Dale otra vuelta</text>
</svg>
`;

// SVG para icono de notificación (monocromático blanco)
const createNotificationIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(48, 48)">
    <!-- Flechas circulares simplificadas -->
    <path d="M -15 -22 A 28 28 0 0 1 22 -12"
          stroke="${WHITE}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <polygon points="20,-18 28,-10 18,-8" fill="${WHITE}"/>
    <path d="M 15 22 A 28 28 0 0 1 -22 12"
          stroke="${WHITE}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <polygon points="-20,18 -28,10 -18,8" fill="${WHITE}"/>

    <!-- Hoja pequeña -->
    <ellipse cx="0" cy="0" rx="8" ry="12" fill="${WHITE}"/>
  </g>
</svg>
`;

// SVG para favicon
const createFaviconSVG = (size) => createMainIconSVG(size, true);

async function generateAssets() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('🎨 Generando assets de Reusa...\n');

  const assets = [
    { name: 'icon.png', svg: createMainIconSVG(1024, true), size: 1024 },
    { name: 'adaptive-icon.png', svg: createAdaptiveIconSVG(1024), size: 1024 },
    { name: 'splash.png', svg: createSplashSVG(1284, 2778), width: 1284, height: 2778 },
    { name: 'notification-icon.png', svg: createNotificationIconSVG(96), size: 96 },
    { name: 'favicon.png', svg: createFaviconSVG(48), size: 48 },
  ];

  for (const asset of assets) {
    const filePath = path.join(assetsDir, asset.name);

    await sharp(Buffer.from(asset.svg))
      .png()
      .toFile(filePath);

    const dimensions = asset.width ? `${asset.width}x${asset.height}` : `${asset.size}x${asset.size}`;
    console.log(`✅ ${asset.name} (${dimensions})`);
  }

  console.log('\n🎉 Assets generados exitosamente!');
  console.log('\n📁 Archivos en:', assetsDir);
  console.log('\n💡 El diseño incluye:');
  console.log('   - Flechas circulares (símbolo de reuso/reciclaje)');
  console.log('   - Hoja central (sustentabilidad)');
  console.log('   - Colores de marca (#2D9B6E)\n');
}

generateAssets().catch(console.error);
