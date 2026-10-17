import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with brutalist rounded corners -->
  <rect width="1024" height="1024" rx="224" fill="#090a0f"/>
  <rect x="16" y="16" width="992" height="992" rx="208" stroke="#27272a" stroke-width="12" fill="none"/>
  
  <!-- Subtle Grid Accent -->
  <path d="M512 120V904M120 512H904" stroke="#18181b" stroke-width="8" stroke-dasharray="16 16"/>

  <!-- Viewfinder Frame Brackets (FlowSnap Dual-Capture Lens) -->
  <!-- Top-Left Bracket -->
  <path d="M220 340V220H340" stroke="#10b981" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Top-Right Bracket -->
  <path d="M684 220H804V340" stroke="#10b981" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Bottom-Left Bracket -->
  <path d="M220 684V804H340" stroke="#10b981" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Bottom-Right Bracket -->
  <path d="M684 804H804V684" stroke="#10b981" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Center Shutter Lens Ring -->
  <circle cx="512" cy="512" r="240" fill="#12131a" stroke="#27272a" stroke-width="24"/>
  <circle cx="512" cy="512" r="180" stroke="#10b981" stroke-width="8" stroke-dasharray="24 16"/>

  <!-- Aperture Shutter Blades Motif -->
  <path d="M512 332L639 439M692 512L585 639M512 692L385 585M332 512L439 385" stroke="#3f3f46" stroke-width="12" stroke-linecap="round"/>

  <!-- Center Monospace Typography "FS" -->
  <text x="512" y="580" text-anchor="middle" font-family="monospace, monospace" font-size="210" font-weight="900" fill="#ffffff" letter-spacing="-8">FS</text>

  <!-- Live Record Indicator Light (Pulsing Emerald) -->
  <circle cx="740" cy="284" r="32" fill="#10b981"/>
  <circle cx="740" cy="284" r="50" stroke="#10b981" stroke-width="8" opacity="0.4"/>
</svg>
`;

async function main() {
  const iconSourcePng = path.resolve('src-tauri/icons/flowsnap-master-icon.png');
  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(iconSourcePng);
  console.log('✅ Master 1024x1024 icon generated at:', iconSourcePng);

  // Run Tauri Icon Generator
  execSync(`npx tauri icon "${iconSourcePng}"`, { stdio: 'inherit' });
  console.log('🎉 Tauri app & installer icons updated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
