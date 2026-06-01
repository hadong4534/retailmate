import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  unsubscribe?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let body: Body;
  try { body = (await request.json()) as Body; } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  if (!endpoint) return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 400 });

  const admin = createAdminClient();

  if (body.unsubscribe) {
    await admin.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  }

  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!p256dh || !auth) return NextResponse.json({ error: '구독 키가 없습니다.' }, { status: 400 });

  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth, user_agent: request.headers.get('user-agent') ?? null },
      { onConflict: 'endpoint' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
