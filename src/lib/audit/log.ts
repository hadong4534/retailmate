import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditEntry {
  storeId: string;
  actorId: string;
  actorRole?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 감사 로그 기록. 위임(매니저) 운영 시 "누가 무엇을 바꿨는지" 추적용.
 * 실패해도 본 동작에는 영향 없음 (fire-and-forget, admin client로 RLS 우회 insert).
 */
export async function logAudit(e: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      store_id: e.storeId,
      actor_id: e.actorId,
      actor_role: e.actorRole ?? null,
      action: e.action,
      target_type: e.targetType ?? null,
      target_id: e.targetId ?? null,
      summary: e.summary ?? null,
      metadata: e.metadata ?? null,
    });
  } catch (err) {
    console.error('[audit] 기록 실패:', err);
  }
}
