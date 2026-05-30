// 카카오·OG·favicon 등 외부 플랫폼용 아이콘 세트를 PNG/ICO로 변환.
// 입력: public/app-icon.svg
// 출력:
//   - public/app-icon-512.png, public/app-icon-256.png, public/app-icon-128.png  (호환 유지)
//   - public/favicon-16x16.png, public/favicon-32x32.png, public/favicon-48x48.png
//   - public/apple-touch-icon.png (180)
//   - public/android-chrome-192x192.png, public/android-chrome-512x512.png
//   - public/favicon.ico (16+32+48 멀티 사이즈)

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const svgPath = path.join(projectRoot, 'public', 'app-icon.svg');
const svg = readFileSync(svgPath);

// 일반 PNG 변환 헬퍼 — SVG를 정해진 크기로 렌더 후 저장
async function makePng(filename, size) {
  const out = path.join(projectRoot, 'public', filename);
  const buf = await sharp(svg).resize(size, size).png().toBuffer();
  writeFileSync(out, buf);
  console.log(`✓ ${filename} (${size}x${size}, ${buf.length} bytes)`);
}

// 1) 호환 유지용 (기존 app-icon-* 시리즈)
await makePng('app-icon-512.png', 512);
await makePng('app-icon-256.png', 256);
await makePng('app-icon-128.png', 128);

// 2) favicon PNG 세트
await makePng('favicon-16x16.png', 16);
await makePng('favicon-32x32.png', 32);
await makePng('favicon-48x48.png', 48);

// 3) iOS 홈화면용
await makePng('apple-touch-icon.png', 180);

// 4) Android Chrome용
await makePng('android-chrome-192x192.png', 192);
await makePng('android-chrome-512x512.png', 512);

// 5) favicon.ico — 16+32+48 멀티 사이즈로 빌드
const icoBuf = await pngToIco([
  path.join(projectRoot, 'public', 'favicon-16x16.png'),
  path.join(projectRoot, 'public', 'favicon-32x32.png'),
  path.join(projectRoot, 'public', 'favicon-48x48.png'),
]);
const icoOut = path.join(projectRoot, 'public', 'favicon.ico');
writeFileSync(icoOut, icoBuf);
console.log(`✓ favicon.ico (16+32+48, ${icoBuf.length} bytes)`);

console.log('\n전체 아이콘 세트 생성 완료.');
