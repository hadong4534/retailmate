'use client';

import { useEffect, useState } from 'react';
import { Download, Share2, Plus, X, AlertTriangle, MoreVertical } from 'lucide-react';

/**
 * PWA 설치 안내 배너 + 상세 모달.
 *
 * 노출 조건:
 *   1) 모바일 (스마트폰)
 *   2) 아직 standalone 모드가 아닌 (홈 화면에서 띄운 게 아닌) 상태
 *   3) 7일 내 닫지 않음 (localStorage)
 *
 * 플랫폼/브라우저 분기:
 *   - iOS Safari → 정상 설치 가이드 (공유 → 홈 화면에 추가)
 *   - iOS Chrome/Whale/카카오톡 인앱 → "Safari로 열어주세요" 강제 안내
 *   - Android Chrome → beforeinstallprompt로 원클릭 설치
 *   - Android 삼성 인터넷 → 별도 메뉴 안내
 *   - Android 기타 → Chrome 권장
 */
const DISMISS_KEY = 'rm-install-prompt-dismissed-at';
const DISMISS_HIDE_MS = 1000 * 60 * 60 * 24 * 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Platform =
  | 'ios-safari'
  | 'ios-other'       // iOS인데 Safari가 아닌 브라우저 (Chrome/Whale/카카오톡 인앱 등)
  | 'android-chrome'
  | 'android-samsung'
  | 'android-other'
  | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const lower = ua.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(lower);
  const isAndroid = /android/.test(lower);

  if (isIOS) {
    // iOS Safari 식별: 'Safari'가 있고 'CriOS', 'FxiOS', 'EdgiOS' 등 다른 브라우저 표식이 없어야 함
    const isOtherBrowser = /(crios|fxios|edgios|opios|whale|kakaotalk|fban|fbav|instagram)/i.test(ua);
    return isOtherBrowser ? 'ios-other' : 'ios-safari';
  }
  if (isAndroid) {
    if (/samsungbrowser/i.test(ua)) return 'android-samsung';
    if (/chrome/i.test(ua) && !/edg|opr/i.test(ua)) return 'android-chrome';
    return 'android-other';
  }
  return 'desktop';
}

export function InstallPromptBanner() {
  const [show, setShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_HIDE_MS) return;

    const p = detectPlatform();
    if (p === 'desktop') return;
    setPlatform(p);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const delay = setTimeout(() => setShow(true), 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(delay);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
    setModalOpen(false);
  }

  async function installAndroid() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') dismiss();
  }

  function copyUrl() {
    const url = 'https://www.retailmate.io';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => null);
    }
  }

  if (!show) return null;

  // 배너 (하단 floating) — 짧은 안내 + "자세히 보기" 버튼
  const headline = headlineFor(platform);

  return (
    <>
      <div
        role="dialog"
        aria-label="앱처럼 설치"
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-3 right-3 z-40 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur-md lg:hidden"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white">
            <Download className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-slate-900">앱처럼 설치하기</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{headline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {platform === 'android-chrome' && deferred && (
                <button
                  type="button"
                  onClick={installAndroid}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700 active:scale-[0.98]"
                >
                  지금 설치
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                자세히 보기
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="닫기"
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {modalOpen && (
        <InstallGuideModal
          platform={platform}
          deferred={deferred}
          onInstall={installAndroid}
          onCopyUrl={copyUrl}
          onClose={() => setModalOpen(false)}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}

/* ───────────────────────── 배너 헤드라인 ───────────────────────── */
function headlineFor(p: Platform): string {
  switch (p) {
    case 'ios-safari':
      return '아이폰 홈 화면에 추가하면 앱 아이콘처럼 빠르게 열 수 있어요.';
    case 'ios-other':
      return '⚠ 아이폰은 Safari에서 설치해야 합니다. Safari로 다시 열어주세요.';
    case 'android-chrome':
      return '한 번 누르면 갤럭시 홈 화면에 앱처럼 설치됩니다.';
    case 'android-samsung':
      return '삼성 인터넷에서도 홈 화면에 앱 아이콘으로 추가할 수 있어요.';
    case 'android-other':
      return '안드로이드는 Chrome으로 열면 가장 매끄럽게 설치돼요.';
    default:
      return '';
  }
}

/* ───────────────────────── 상세 가이드 모달 ───────────────────────── */
function InstallGuideModal({
  platform,
  deferred,
  onInstall,
  onCopyUrl,
  onClose,
  onDismiss,
}: {
  platform: Platform;
  deferred: BeforeInstallPromptEvent | null;
  onInstall: () => void;
  onCopyUrl: () => void;
  onClose: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isIOS = platform === 'ios-safari' || platform === 'ios-other';
  const isAndroid = platform.startsWith('android-');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[16px] font-bold text-slate-900">홈 화면에 추가하기</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {/* iOS Safari 가 아닌 경우 — 강제 안내 */}
          {platform === 'ios-other' && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
              <div>
                <p className="font-bold">반드시 Safari로 열어주세요</p>
                <p className="mt-1 leading-relaxed">
                  카카오톡·Chrome·웨일 등 다른 브라우저에서는 홈 화면 추가가 작동하지 않습니다.
                  하단 안내를 따라 <strong>Safari</strong>에서 다시 열어주세요.
                </p>
                <button
                  type="button"
                  onClick={onCopyUrl}
                  className="mt-2 rounded-md bg-amber-900 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-amber-950"
                >
                  주소 복사하기
                </button>
              </div>
            </div>
          )}

          {/* iOS Safari — 단계별 */}
          {isIOS && (
            <>
              <SectionTitle label={platform === 'ios-other' ? 'Safari로 열고 난 다음' : '아이폰 Safari에서'} />
              <Step n={1}>
                화면 <strong>하단 가운데</strong>의{' '}
                <Share2 className="mx-0.5 inline h-3.5 w-3.5 align-[-2px] text-indigo-600" strokeWidth={2.2} />{' '}
                <strong>공유</strong> 버튼을 누릅니다. (사각형 위로 화살표가 솟은 모양)
              </Step>
              <Step n={2}>
                메뉴를 위로 살짝 올린 뒤{' '}
                <strong>"홈 화면에 추가"</strong>를 선택합니다.
                <span className="ml-1 inline-flex items-center gap-0.5 text-indigo-600">
                  <Plus className="h-3 w-3" strokeWidth={2.2} /> Add to Home Screen
                </span>
              </Step>
              <Step n={3}>
                이름이 <strong>"리테일메이트"</strong>로 자동 채워집니다. 우측 상단의{' '}
                <strong>"추가"</strong>를 누르면 끝.
              </Step>
              <Step n={4}>
                홈 화면에 <strong>앱 아이콘</strong>이 생깁니다. 다음부터는 이 아이콘으로 열면
                주소창 없이 앱처럼 사용할 수 있어요.
              </Step>

              <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-[12px] leading-relaxed text-indigo-900">
                <p className="font-semibold">참고</p>
                <p className="mt-0.5">
                  iPhone은 <strong>Safari에서만</strong> 홈 화면 추가가 됩니다.
                  Chrome·웨일·카카오톡 안의 브라우저에서는 안 보여요.
                </p>
              </div>
            </>
          )}

          {/* Android Chrome — 원클릭 또는 단계별 */}
          {platform === 'android-chrome' && (
            <>
              <SectionTitle label="갤럭시 Chrome에서" />
              {deferred ? (
                <>
                  <Step n={1}>
                    아래의 <strong>"앱 설치"</strong> 버튼을 누릅니다.
                  </Step>
                  <Step n={2}>
                    "설치하시겠습니까?" 안내가 뜨면 <strong>"설치"</strong>를 누릅니다.
                  </Step>
                  <Step n={3}>
                    잠시 후 <strong>앱 서랍과 홈 화면</strong>에 리테일메이트 아이콘이 생깁니다.
                  </Step>
                  <button
                    type="button"
                    onClick={onInstall}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] hover:bg-indigo-700"
                  >
                    <Download className="h-4 w-4" strokeWidth={2.4} />
                    지금 앱 설치
                  </button>
                </>
              ) : (
                <>
                  <Step n={1}>
                    Chrome 우측 상단{' '}
                    <MoreVertical className="mx-0.5 inline h-3.5 w-3.5 align-[-2px] text-slate-600" strokeWidth={2.2} />{' '}
                    <strong>점 3개 메뉴</strong>를 누릅니다.
                  </Step>
                  <Step n={2}>
                    <strong>"앱 설치"</strong> 또는 <strong>"홈 화면에 추가"</strong>를 선택합니다.
                    (Chrome 버전마다 표기 다름)
                  </Step>
                  <Step n={3}>
                    안내 팝업의 <strong>"설치"</strong> 버튼 → 홈 화면·앱 서랍에 아이콘 생성.
                  </Step>
                </>
              )}
            </>
          )}

          {/* Android Samsung Internet */}
          {platform === 'android-samsung' && (
            <>
              <SectionTitle label="갤럭시 삼성 인터넷에서" />
              <Step n={1}>
                화면 하단의 <strong>메뉴</strong> 버튼(가로줄 3개)을 누릅니다.
              </Step>
              <Step n={2}>
                <strong>"현재 페이지 추가"</strong> → <strong>"홈 화면"</strong> 을 선택합니다.
              </Step>
              <Step n={3}>
                이름을 확인하고 <strong>"추가"</strong>를 누르면 홈 화면에 아이콘 생성.
              </Step>
              <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-[12px] leading-relaxed text-indigo-900">
                <p className="font-semibold">팁</p>
                <p className="mt-0.5">
                  더 매끄러운 앱 설치를 원하면 <strong>Chrome</strong>으로 열어보세요.
                  Chrome에서는 한 번 누르면 자동 설치됩니다.
                </p>
              </div>
            </>
          )}

          {/* Android 기타 브라우저 */}
          {platform === 'android-other' && (
            <>
              <SectionTitle label="안드로이드 기타 브라우저" />
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
                <p className="font-bold">Chrome으로 열어주세요</p>
                <p className="mt-1 leading-relaxed">
                  현재 브라우저에서는 홈 화면 추가가 매끄럽지 않을 수 있습니다.
                  Chrome에서 retailmate.io를 다시 열면 한 번에 설치됩니다.
                </p>
                <button
                  type="button"
                  onClick={onCopyUrl}
                  className="mt-2 rounded-md bg-amber-900 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-amber-950"
                >
                  주소 복사하기
                </button>
              </div>
            </>
          )}

          {/* 공통 — 설치 후 안내 */}
          {(platform === 'ios-safari' || isAndroid) && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">설치 후 좋은 점</p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                <li>주소창·탭 없이 풀스크린으로 열림</li>
                <li>홈 화면 아이콘으로 즉시 진입</li>
                <li>로그인 상태가 더 잘 유지됨</li>
                <li>오프라인 상태에서도 일부 화면 표시 가능</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onDismiss}
            className="text-[12px] font-medium text-slate-500 hover:text-slate-700"
          >
            나중에 (7일간 숨김)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</h3>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
        {n}
      </span>
      <p className="text-[13px] leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}
