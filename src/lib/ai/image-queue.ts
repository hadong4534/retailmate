/**
 * 클라이언트 측 이미지 생성 큐 — localStorage 기반.
 *
 * 폼에서 generate 호출 → enqueue(imageId) → 글로벌 워처가 polling하여 완료/실패 토스트 표시.
 * 페이지 이동·새로고침 후에도 유지된다.
 *
 * 다중 탭에서는 storage 이벤트로 동기화될 수 있으나, 현 단계에서는 같은 탭 내 워처만 보장.
 */

const KEY = 'rm.ai.queue';
const EVENT = 'rm:ai-queue-changed';

export interface QueueItem {
  id: string;            // image id (DB)
  kind: string;          // poster | sns | card_news | free
  prompt: string;        // 사용자 프롬프트 (토스트에 미리보기용)
  enqueuedAt: number;    // ms epoch
}

function safeRead(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is QueueItem =>
        x && typeof x === 'object' &&
        typeof x.id === 'string' &&
        typeof x.kind === 'string' &&
        typeof x.prompt === 'string' &&
        typeof x.enqueuedAt === 'number',
    );
  } catch {
    return [];
  }
}

function safeWrite(items: QueueItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

export function getQueue(): QueueItem[] {
  return safeRead();
}

export function enqueue(item: Omit<QueueItem, 'enqueuedAt'> & { enqueuedAt?: number }): void {
  const items = safeRead();
  if (items.some((x) => x.id === item.id)) return;
  items.push({ ...item, enqueuedAt: item.enqueuedAt ?? Date.now() });
  safeWrite(items);
}

export function dequeue(id: string): void {
  const items = safeRead().filter((x) => x.id !== id);
  safeWrite(items);
}

export function clearStale(maxAgeMs = 30 * 60 * 1000): void {
  const now = Date.now();
  const items = safeRead().filter((x) => now - x.enqueuedAt < maxAgeMs);
  safeWrite(items);
}

/**
 * 큐 변경을 구독. 컴포넌트 unmount 시 unsubscribe 호출.
 */
export function subscribeQueue(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
