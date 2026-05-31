/**
 * 자동 로그인 플래그 — localStorage(영구) + sessionStorage(세션)을 조합해
 * "체크 안 하면 브라우저 닫을 때 자동 로그아웃" 동작을 구현.
 *
 * - PERSIST_KEY: 영구. 사용자가 자동 로그인을 원하는지(`'1'`)/원치 않는지(`'0'`).
 * - SESSION_KEY: 세션 한정. 새 브라우저 윈도우에서는 비어 있음.
 *
 * 판정 규칙 (SessionGuard 내부):
 *   PERSIST_KEY === '1'  →  영구 유지 (그대로)
 *   PERSIST_KEY === '0'  →  SESSION_KEY가 있으면 OK, 없으면 → signOut
 *
 * SSR에서는 createClient/cookies 가 자동 갱신하므로 클라이언트에서만 동작하면 충분.
 */

export const PERSIST_KEY = 'rm_remember';
export const SESSION_KEY = 'rm_session_active';

export function setRememberFlag(remember: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERSIST_KEY, remember ? '1' : '0');
    // 새 로그인 — 현재 세션 active로 표시
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export function markSessionActive(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export function clearRememberFlags(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PERSIST_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * 현재 상태에서 자동 로그아웃이 필요한지 판정.
 * true면 호출부에서 supabase.auth.signOut() + redirect 처리.
 */
export function shouldAutoSignOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const persist = localStorage.getItem(PERSIST_KEY);
    if (persist !== '0') return false; // 영구 유지 또는 미설정 (기본 유지)
    const active = sessionStorage.getItem(SESSION_KEY);
    return !active; // 활성 세션이 없으면 = 브라우저 재시작
  } catch {
    return false;
  }
}
