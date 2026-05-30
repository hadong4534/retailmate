'use client';

import { useState, useTransition, type ComponentType, type SVGProps } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { switchStore } from '@/lib/auth/actions';
import { clearRememberFlags } from '@/lib/auth/session-flag';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { StoreSwitcher, type StoreOption } from './StoreSwitcher';
import { TopProgressBar } from './TopProgressBar';
import {
  HomeIcon,
  SalesIcon,
  ExpensesIcon,
  PeopleIcon,
  ClockAlarmIcon,
  ClipboardIcon,
  MegaphoneIcon,
  BarChartIcon,
  GearIcon,
  PlusIcon,
  LogoutIcon,
  ChevronDownIcon,
  SparklesIcon,
} from '@/components/icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  href: string;
  label: string;
  Icon: Icon;
}

interface NavGroup {
  title: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [{ href: '/dashboard', label: '홈', Icon: HomeIcon }],
  },
  {
    title: '돈 관리',
    items: [
      { href: '/sales', label: '매출', Icon: SalesIcon },
      { href: '/expenses', label: '비용', Icon: ExpensesIcon },
      { href: '/reports', label: '리포트', Icon: BarChartIcon },
    ],
  },
  {
    title: '직원 관리',
    items: [
      { href: '/employees', label: '직원 관리', Icon: PeopleIcon },
      { href: '/attendance', label: '근태 현황', Icon: ClockAlarmIcon },
      { href: '/employees/payroll', label: '급여 계산', Icon: SalesIcon },
      { href: '/contracts', label: '계약서', Icon: ClipboardIcon },
    ],
  },
  {
    title: 'AI',
    items: [
      { href: '/ai', label: 'AI 도구', Icon: SparklesIcon },
    ],
  },
  {
    title: '소식',
    items: [{ href: '/notices', label: '공지', Icon: MegaphoneIcon }],
  },
  {
    title: '시스템',
    items: [{ href: '/settings', label: '설정', Icon: GearIcon }],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { href: '/dashboard', label: '홈', Icon: HomeIcon },
  { href: '/sales', label: '매출', Icon: SalesIcon },
  { href: '/expenses', label: '비용', Icon: ExpensesIcon },
  { href: '/employees', label: '직원', Icon: PeopleIcon },
  { href: '/reports', label: '리포트', Icon: BarChartIcon },
];

const STAFF_TAB_PREFIXES = ['/employees', '/attendance', '/contracts'];

/** 모바일 하단 탭바를 숨길 경로 — 채팅 입력창과 탭바가 충돌하기 때문. */
const HIDE_MOBILE_TABBAR_PREFIXES = ['/ai/chat'];

/**
 * 사이드바/탭바 active 매칭.
 * - 정확 매칭은 항상 active.
 * - 일부 라우트는 "hub" 성격이라 자식 segment가 사이드바에 별개 메뉴로 존재.
 *   예: `/employees`와 `/employees/payroll`이 둘 다 있을 때
 *       `/employees/payroll` 진입 시 `/employees`는 active가 아니어야 한다.
 * - 그 외는 자식(예: `/sales/new`, `/contracts/new`)에서도 부모 메뉴 active 유지.
 */
const EXACT_MATCH_ONLY = new Set([
  '/dashboard',
  '/employees', // /employees/payroll이 별개 사이드바 메뉴이므로
]);

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (EXACT_MATCH_ONLY.has(href)) return false;
  return pathname.startsWith(href + '/');
}

function shouldHideMobileTabbar(pathname: string): boolean {
  return HIDE_MOBILE_TABBAR_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isStaffTabActive(pathname: string): boolean {
  return STAFF_TAB_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function AppShell({
  children,
  storeName,
  ownerName,
  ownerAvatarUrl,
  role = 'owner',
  currentStore,
  storeOptions,
}: {
  children: React.ReactNode;
  storeName: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  role?: 'owner' | 'manager' | 'employee';
  currentStore?: StoreOption;
  storeOptions?: StoreOption[];
}) {
  const roleLabel = role === 'owner' ? '최고관리자' : role === 'manager' ? '매니저' : '직원';
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [storeSwitching, startStoreSwitch] = useTransition();
  const hasMultipleStores = (storeOptions?.length ?? 0) > 1;
  const hideMobileTabbar = shouldHideMobileTabbar(pathname);

  function handleSwitchStore(storeId: string) {
    if (!currentStore || storeId === currentStore.storeId) {
      setStorePickerOpen(false);
      return;
    }
    startStoreSwitch(async () => {
      const result = await switchStore(storeId);
      setStorePickerOpen(false);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      // 사용자 요청: 매장 전환 시 어느 탭에 있었든 홈으로 이동 (PC StoreSwitcher와 동일 동작).
      // replace로 뒤로가기 시 이전 매장 페이지로 돌아가지 않게 + refresh로 서버 컴포넌트 새 매장 컨텍스트로.
      router.replace('/dashboard');
      router.refresh();
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearRememberFlags();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <TopProgressBar />
      {/* 사이드바 (PC) — 다크 네이비 */}
      <aside className="hidden w-60 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <Link href="/dashboard" aria-label="리테일메이트 홈">
            <Logo size="md" onDark />
          </Link>
        </div>
        {currentStore && storeOptions && storeOptions.length > 0 && (
          <div className="border-b border-slate-800 px-3 py-3">
            <StoreSwitcher current={currentStore} options={storeOptions} onDark />
          </div>
        )}
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx}>
              {group.title && (
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.Icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={active ? false : true}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]',
                        active
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700',
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-bold text-white">
              {ownerAvatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={ownerAvatarUrl} alt={ownerName} className="h-full w-full object-cover" />
              ) : (
                ownerName.charAt(0) || '?'
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{ownerName}</p>
              <span
                className={
                  'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ' +
                  (role === 'owner'
                    ? 'bg-blue-500/20 text-blue-300'
                    : role === 'manager'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-500/30 text-slate-300')
                }
              >
                {roleLabel}
              </span>
            </div>
          </div>
          {!currentStore && (
            <div className="mt-1 text-xs text-slate-500">{storeName}</div>
          )}
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            <LogoutIcon className="h-3.5 w-3.5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* TopBar (모바일) — sticky로 스크롤 시 상단 고정 + 약한 backdrop blur
          PWA 풀스크린(viewportFit: cover)에서 iOS 노치·다이내믹 아일랜드와 겹치지 않도록
          padding-top에 safe-area-inset-top 추가. 일반 Safari에서는 0이라 영향 없음. */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(3.5rem + env(safe-area-inset-top))',
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/dashboard" aria-label="리테일메이트 홈" className="shrink-0">
            <Logo size="sm" />
          </Link>
          {currentStore?.storeName && (
            <>
              <span className="h-4 w-px shrink-0 bg-slate-300" aria-hidden />
              {/* 매장 전환 버튼 — 멀티 매장이면 클릭 가능 */}
              {hasMultipleStores ? (
                <button
                  type="button"
                  onClick={() => setStorePickerOpen((v) => !v)}
                  className="inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  aria-haspopup="menu"
                  aria-expanded={storePickerOpen}
                  disabled={storeSwitching}
                  title={currentStore.storeName}
                >
                  <span className="min-w-0 truncate">{currentStore.storeName}</span>
                  <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              ) : (
                <span
                  className="min-w-0 truncate text-[13px] font-semibold text-slate-700"
                  title={currentStore.storeName}
                >
                  {currentStore.storeName}
                </span>
              )}

              {/* 매장 전환 드롭다운 */}
              {storePickerOpen && hasMultipleStores && storeOptions && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setStorePickerOpen(false)}
                    aria-hidden
                  />
                  <div className="absolute left-3 top-12 z-40 w-64 rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">매장 전환</p>
                    </div>
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {storeOptions.map((o) => {
                        const active = o.storeId === currentStore.storeId;
                        return (
                          <li key={o.storeId}>
                            <button
                              type="button"
                              onClick={() => handleSwitchStore(o.storeId)}
                              disabled={storeSwitching}
                              className={
                                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition active:bg-slate-50 ' +
                                (active ? 'bg-blue-50' : 'hover:bg-slate-50')
                              }
                            >
                              <span className="min-w-0 flex-1">
                                <span className={'block truncate ' + (active ? 'font-semibold text-blue-700' : 'text-slate-900')}>
                                  {o.storeName}
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  {o.role === 'owner' ? '최고관리자' : '매니저'}
                                </span>
                              </span>
                              {active && <span className="ml-2 text-xs text-blue-600">✓</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-slate-100 p-1">
                      <Link
                        href="/stores/new"
                        onClick={() => setStorePickerOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        + 새 매장 추가
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-slate-100"
          aria-label="프로필 메뉴"
        >
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            {ownerAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ownerAvatarUrl} alt={ownerName} className="h-full w-full object-cover" />
            ) : (
              ownerName.charAt(0) || '?'
            )}
          </span>
          <span className="hidden text-xs sm:inline">{ownerName}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {profileOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setProfileOpen(false)}
              aria-hidden
            />
            <div className="absolute right-3 top-12 z-40 w-56 rounded-md border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{ownerName}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {roleLabel} · {currentStore?.storeName ?? storeName}
                </p>
              </div>
              <ul className="py-1">
                <li>
                  <Link
                    href="/ai"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <SparklesIcon className="h-4 w-4 text-slate-500" />
                    AI 도구
                  </Link>
                </li>
                <li>
                  <Link
                    href="/notices"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <MegaphoneIcon className="h-4 w-4 text-slate-500" />
                    공지사항
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <GearIcon className="h-4 w-4 text-slate-500" />
                    설정
                  </Link>
                </li>
                <li>
                  <Link
                    href="/stores/new"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <PlusIcon className="h-4 w-4 text-slate-500" />
                    매장 추가
                  </Link>
                </li>
              </ul>
              <div className="border-t border-slate-200 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogoutIcon className="h-4 w-4 text-slate-500" />
                  로그아웃
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* 메인 컨텐츠 — 모바일 하단 탭바(68px) + safe-area 영역 만큼 padding. 탭바 숨김 페이지는 0. */}
      <main
        className={cn(
          'flex-1 lg:pb-0',
          hideMobileTabbar ? 'pb-0' : 'pb-[calc(68px+env(safe-area-inset-bottom))]',
        )}
      >
        {children}
      </main>

      {/* BottomTab (모바일) — 높이 68px + safe-area. 활성색 파랑·라벨 강조로 도트 indicator 대체. */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden',
          hideMobileTabbar && 'hidden',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[68px] items-center justify-around px-1">
          {BOTTOM_NAV.map((item) => {
            const active =
              item.href === '/employees'
                ? isStaffTabActive(pathname)
                : isActive(pathname, item.href);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                // 비활성 탭은 강제 prefetch=true — 모바일에서 viewport 자동 prefetch가 누락되는 케이스
                // (Save-Data, 느린 네트워크 감지 등)에서도 항상 RSC 페이로드를 미리 받아 탭 클릭 시 즉시 전환.
                prefetch={active ? false : true}
                className={cn(
                  'relative flex h-full min-w-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] text-[11px] transition-all duration-150 active:scale-[0.94] active:bg-slate-100/60',
                  active ? 'font-semibold text-blue-600' : 'font-medium text-slate-500',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
