'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  shouldAutoSignOut,
  markSessionActive,
  clearRememberFlags,
} from '@/lib/auth/session-flag';

/**
 * 자동 로그인 미체크 사용자 → 브라우저 재시작 시 자동 로그아웃.
 *
 * 동작:
 * 1. 마운트 시 sessionStorage를 검사
 * 2. 자동 로그아웃 조건이면 supabase.auth.signOut() + /login으로 리다이렉트
 * 3. 그 외에는 sessionStorage flag를 새로 갱신해 다음 새로고침에서도 OK
 */
export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    if (shouldAutoSignOut()) {
      const supabase = createClient();
      supabase.auth.signOut().finally(() => {
        clearRememberFlags();
        router.replace('/login?expired=1');
        router.refresh();
      });
      return;
    }
    markSessionActive();
  }, [router]);

  return null;
}
