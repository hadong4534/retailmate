import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // PWA/favicon 정적 파일은 인증 체크를 건너뛴다.
  // .webmanifest 와 site.webmanifest 도 명시적으로 제외 (기존엔 빠져 있어 /site.webmanifest 가 /login 으로 리다이렉트되던 버그).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|site.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|webmanifest|mp4|webm|mov|m4v|mp3)$).*)'],
};
