/**
 * 리테일메이트 Service Worker — 최소한의 안전한 오프라인 지원.
 *
 * 정책:
 *  - 정적 자산(아이콘·매니페스트·이미지): cache-first (앱 like 즉시 로딩)
 *  - 페이지(navigate): network-first → 실패 시 캐시 (오프라인 fallback)
 *  - API/auth: 절대 캐시하지 않음 (실시간 데이터 보장)
 *
 * 이 SW가 매일 retailmate.io 트래픽을 가로채므로 변경 시 신중히.
 * 캐시 키 버전을 올리면 옛 캐시는 자동 삭제.
 */
const CACHE_VERSION = 'rm-v6';
const STATIC_ASSETS = [
  '/site.webmanifest',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) 외부 도메인은 SW가 건드리지 않음
  if (url.origin !== self.location.origin) return;

  // 2) API/auth는 절대 캐시 금지 — 실시간 데이터·세션 검증
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    return;
  }

  // 3) 정적 자산: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|webmanifest)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  // 4) 페이지(navigate): network-first → fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // 인증 redirect(307)나 5xx는 캐시하지 않음
          if (res.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          const cached = await cache.match(req);
          if (cached) return cached;
          // 그래도 없으면 dashboard 캐시 또는 빈 응답
          return (
            (await cache.match('/dashboard')) ||
            new Response('오프라인 상태입니다. 인터넷 연결을 확인해주세요.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
  }
});
