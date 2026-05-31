/**
 * 쿠키 Domain 속성을 결정한다.
 *
 * retailmate.io와 www.retailmate.io 양쪽에서 같은 인증 세션을 공유하려면
 * Domain=retailmate.io 로 설정해야 한다 (이러면 retailmate.io + 모든 서브도메인에 적용).
 *
 * localhost, vercel.app 등 다른 호스트에서는 Domain 미설정 (현재 호스트에만 적용).
 */
export function cookieDomainFor(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  // 포트 제거
  const hostOnly = host.split(':')[0].toLowerCase();
  if (/^(.+\.)?retailmate\.io$/.test(hostOnly)) return 'retailmate.io';
  return undefined;
}
