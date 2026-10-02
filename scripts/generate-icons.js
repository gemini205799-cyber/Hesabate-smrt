import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Beautiful vector SVG for Hesabati
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0a192f" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background container -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="#3b82f6" stroke-width="4" stroke-opacity="0.4" />

  <!-- Outer ambient ring -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="8 8" opacity="0.4" />

  <!-- Wallet Body -->
  <rect x="120" y="150" width="272" height="212" rx="36" fill="url(#cardGrad)" filter="url(#glow)" />
  <rect x="120" y="150" width="272" height="212" rx="36" fill="none" stroke="#60a5fa" stroke-width="3" />

  <!-- Wallet Flap / Detail -->
  <path d="M 120 186 C 120 166 136 150 156 150 L 356 150 C 376 150 392 166 392 186 L 392 200 L 120 200 Z" fill="#1e40af" opacity="0.6" />

  <!-- Card Peeking out -->
  <rect x="160" y="120" width="192" height="70" rx="16" fill="url(#goldGrad)" opacity="0.95" />
  <line x1="180" y1="145" x2="240" y2="145" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />

  <!-- Wallet Lock Clasp -->
  <rect x="300" y="226" width="96" height="60" rx="18" fill="#1e293b" stroke="#60a5fa" stroke-width="3" />
  <circle cx="348" cy="256" r="14" fill="url(#emeraldGrad)" />

  <!-- Dynamic Trend Arrow (Growth) -->
  <circle cx="180" cy="260" r="32" fill="#1e293b" opacity="0.8" />
  <path d="M 166 266 L 176 254 L 186 260 L 194 248" fill="none" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <polygon points="190,248 198,248 198,256" fill="#34d399" />

  <!-- Arabic Typography "حساباتي" Styled -->
  <text x="256" y="420" font-family="'Cairo', sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">حِـسـابـاتـي</text>
  <text x="256" y="450" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="3">SMART FINANCE</text>
</svg>`;

// Maskable icon with 15% safe padding
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a192f" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="cardGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="goldGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="emeraldGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>

  <!-- Full-bleed background for maskable cropping -->
  <rect width="512" height="512" fill="url(#bgGradMask)" />

  <!-- Centered safe zone graphics scaled down 80% to fit safe circle -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <!-- Wallet Body -->
    <rect x="120" y="150" width="272" height="212" rx="36" fill="url(#cardGradMask)" />
    <rect x="120" y="150" width="272" height="212" rx="36" fill="none" stroke="#60a5fa" stroke-width="4" />

    <!-- Card Peeking out -->
    <rect x="160" y="120" width="192" height="70" rx="16" fill="url(#goldGradMask)" />
    <line x1="180" y1="145" x2="240" y2="145" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />

    <!-- Wallet Lock Clasp -->
    <rect x="300" y="226" width="96" height="60" rx="18" fill="#0f172a" stroke="#60a5fa" stroke-width="3" />
    <circle cx="348" cy="256" r="14" fill="url(#emeraldGradMask)" />

    <!-- Dynamic Trend Arrow (Growth) -->
    <circle cx="180" cy="260" r="32" fill="#0f172a" />
    <path d="M 166 266 L 176 254 L 186 260 L 194 248" fill="none" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <polygon points="190,248 198,248 198,256" fill="#34d399" />

    <!-- Arabic Typography -->
    <text x="256" y="420" font-family="'Cairo', sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle">حِـسـابـاتـي</text>
  </g>
</svg>`;

async function buildIcons() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);

  // 192x192
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 512x512 maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 180x180 apple-touch-icon
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // favicon (48x48 png fallback or ico)
  await sharp(Buffer.from(standardSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('All PWA and browser icons generated successfully in public/');
}

buildIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
