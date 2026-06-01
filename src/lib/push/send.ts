import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@retailmate.io';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUB || !PRIV) return false;
  webpush.setVapidDetails(SUBJECT, PUB, PRIV);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return !!(PUB && PRIV);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** 특정 사용자의 모든 기기로 웹푸시 전송. VAPID 미설정이면 무동작. 만료 구독은 자동 정리. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (!subs || subs.length === 0) return 0;

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }),
  );
  return sent;
}
