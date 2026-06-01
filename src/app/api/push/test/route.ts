import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser, pushEnabled } from '@/lib/push/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!pushEnabled()) return NextResponse.json({ error: '서버에 푸시 키(VAPID)가 아직 설정되지 않았습니다.' }, { status: 503 });

  const sent = await sendPushToUser(user.id, {
    title: '리테일메이트 알림 테스트',
    body: '푸시 알림이 정상적으로 도착했어요! 이제 중요한 소식을 놓치지 않아요.',
    url: '/dashboard',
    tag: 'rm-test',
  });
  if (sent === 0) return NextResponse.json({ error: '이 기기의 알림 구독을 먼저 켜주세요.' }, { status: 400 });
  return NextResponse.json({ ok: true, sent });
}
