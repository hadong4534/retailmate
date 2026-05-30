import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // 모바일/외부 터널(serveo, localtunnel, ngrok, cloudflared 등)에서 dev 서버 접근 허용.
  // Next.js 16부터 cross-origin dev 요청을 기본 차단하므로 명시 필요.
  allowedDevOrigins: [
    '*.serveousercontent.com',
    '*.loca.lt',
    '*.ngrok.io',
    '*.ngrok-free.app',
    '*.trycloudflare.com',
    '192.168.0.0/16',
  ],
  experimental: {
    serverActions: {
      // 프로필 사진 등 base64 dataURL 업로드를 허용하려면 1MB 기본값을 늘려야 함
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
