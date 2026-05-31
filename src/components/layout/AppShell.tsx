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
    items: [{ href: '/ai', label: 'AI 도구', Icon: SparklesIcon }],
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

// 모바일 하단 탭: 좌측 2 + 중앙 AI FAB + 우측 2(직원 / 더보기)
const STAFF_TAB_PREFIXES = ['/employees', '/attendance', '/contracts'];

/** 모바일 "더보기" 시트에 들어가는 보조 메뉴 — 하단탭에 없는 모든 기능을 여기서 접근. */
const MORE_LINKS: NavItem[] = [
  { href: '/expenses', label: '비용', Icon: ExpensesIcon },
  { href: '/reports', label: '리포트', Icon: BarChartIcon },
  { href: '/attendance', label: '근태', Icon: ClockAlarmIcon },
  { href: '/contracts', label: '계약서', Icon: ClipboardIcon },
  { href: '/notices', label: '공지', Icon: MegaphoneIcon },
  { href: '/settings', label: '설정', Icon: GearIcon },
];

/** 모바일 하단 탭바를 숨길 경로 — 채팅 입력창과 탭바가 충돌하기 때문. */
const HIDE_MOBILE_TABBAR_PREFIXES = ['/ai/chat'];

const EXACT_MATCH_ONLY = new Set(['/dashboard', '/employees']);

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

function isAiActive(pathname: string): boolean {
  return pathname === '/ai' || pathname.startsWith('/ai/');
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
  const [moreOpen, setMoreOpen] = useState(false);
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <TopProgressBar />

      {/* ───────── 사이드바 (PC) — Aurora 라이트 글래스 ───────── */}
      <aside className="hidden w-60 flex-col border-r border-[#EAEAF7] bg-white/70 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-[#EAEAF7] px-5">
          <Link href="/dashboard" aria-label="리테일메이트 홈">
            <Logo size="md" />
          </Link>
        </div>
        {currentStore && storeOptions && storeOptions.length > 0 && (
          <div className="border-b border-[#EAEAF7] px-3 py-3">
            <StoreSwitcher current={currentStore} options={storeOptions} />
          </div>
        )}
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx}>
              {group.title && (
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.Icon;
                  const isAi = item.href === '/ai';
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={active ? false : true}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]',
                        active
                          ? 'bg-[#6366F1] text-white shadow-[0_6px_16px_-6px_rgba(108,92,231,0.6)]'
                          : 'text-slate-600 hover:bg-[#EEEEFD] hover:text-[#5458E6] active:bg-[#E4E4FB]',
                      )}
                    >
                      <span className={cn('relative flex h-5 w-5 shrink-0 items-center justify-center', isAi && !active && 'text-[#6366F1]')}>
                        <Icon className="h-5 w-5" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-[#EAEAF7] p-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#8E94F2] to-[#6366F1] text-xs font-bold text-white">
              {ownerAvatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={ownerAvatarUrl} alt={ownerName} className="h-full w-full object-cover" />
              ) : (
                ownerName.charAt(0) || '?'
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{ownerName}</p>
              <span
                className={
                  'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ' +
                  (role === 'owner'
                    ? 'bg-[#EEEEFD] text-[#5458E6]'
                    : role === 'manager'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-100 text-slate-500')
                }
              >
                {roleLabel}
              </span>
            </div>
          </div>
          {!currentStore && <div className="mt-1 text-xs text-slate-400">{storeName}</div>}
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#EAEAF7] bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-[#EEEEFD] hover:text-[#5458E6]"
          >
            <LogoutIcon className="h-3.5 w-3.5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* ───────── TopBar (모바일) — 라이트 글래스 ───────── */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#EAEAF7] bg-white/80 px-4 backdrop-blur-xl lg:hidden"
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
              <span className="h-4 w-px shrink-0 bg-[#E4E4FB]" aria-hidden />
              {hasMultipleStores ? (
                <button
                  type="button"
                  onClick={() => setStorePickerOpen((v) => !v)}
                  className="inline-flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 text-left text-[13px] font-semibold text-slate-700 hover:bg-[#EEEEFD] disabled:opacity-50"
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

              {storePickerOpen && hasMultipleStores && storeOptions && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setStorePickerOpen(false)} aria-hidden />
                  <div className="absolute left-3 top-12 z-40 w-64 rounded-2xl border border-[#EAEAF7] bg-white shadow-xl">
                    <div className="border-b border-[#EEEEFD] px-3 py-2">
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
                                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition active:bg-[#EEEEFD] ' +
                                (active ? 'bg-[#EEEEFD]' : 'hover:bg-slate-50')
                              }
                            >
                              <span className="min-w-0 flex-1">
                                <span className={'block truncate ' + (active ? 'font-semibold text-[#5458E6]' : 'text-slate-900')}>
                                  {o.storeName}
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  {o.role === 'owner' ? '최고관리자' : '매니저'}
                                </span>
                              </span>
                              {active && <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-[#6366F1]" aria-hidden />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-[#EEEEFD] p-1">
                      <Link
                        href="/stores/new"
                        onClick={() => setStorePickerOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-[#6366F1] hover:bg-[#EEEEFD]"
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
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm hover:bg-[#EEEEFD]"
          aria-label="프로필 메뉴"
        >
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#8E94F2] to-[#6366F1] text-xs font-semibold text-white">
            {ownerAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ownerAvatarUrl} alt={ownerName} className="h-full w-full object-cover" />
            ) : (
              ownerName.charAt(0) || '?'
            )}
          </span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} aria-hidden />
            <div className="absolute right-3 top-12 z-40 w-56 rounded-2xl border border-[#EAEAF7] bg-white shadow-xl">
              <div className="border-b border-[#EEEEFD] px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{ownerName}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {roleLabel} · {currentStore?.storeName ?? storeName}
                </p>
              </div>
              <ul className="py-1">
                <li>
                  <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-[#EEEEFD]">
                    <GearIcon className="h-4 w-4 text-slate-400" />설정
                  </Link>
                </li>
                <li>
                  <Link href="/stores/new" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-[#EEEEFD]">
                    <PlusIcon className="h-4 w-4 text-slate-400" />매장 추가
                  </Link>
                </li>
              </ul>
              <div className="border-t border-[#EEEEFD] py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-[#EEEEFD]"
                >
                  <LogoutIcon className="h-4 w-4 text-slate-400" />로그아웃
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <main
        className={cn(
          'flex-1 lg:pb-0',
          hideMobileTabbar ? 'pb-0' : 'pb-[calc(76px+env(safe-area-inset-bottom))]',
        )}
      >
        {children}
      </main>

      {/* ───────── 더보기 시트 (모바일) ───────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setMoreOpen(false)} aria-hidden />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-[#EAEAF7] bg-white p-5 shadow-2xl"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden />
            <p className="mb-3 text-sm font-bold text-slate-900">더보기</p>
            <div className="grid grid-cols-3 gap-3">
              {MORE_LINKS.map((item) => {
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-[#EEEEFD] bg-[#FAFAFE] px-2 py-4 text-xs font-medium text-slate-600 transition active:scale-95 active:bg-[#EEEEFD]"
                  >
                    <Icon className="h-6 w-6 text-[#6366F1]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ───────── BottomTab (모바일) — 중앙 AI FAB ───────── */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 border-t border-[#EAEAF7] bg-white/90 backdrop-blur-xl lg:hidden',
          hideMobileTabbar && 'hidden',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative flex h-[76px] items-stretch justify-around px-1">
          {/* 좌측: 홈, 매출 */}
          <BottomLink href="/dashboard" label="홈" Icon={HomeIcon} active={isActive(pathname, '/dashboard')} />
          <BottomLink href="/sales" label="매출" Icon={SalesIcon} active={isActive(pathname, '/sales')} />

          {/* 중앙 AI FAB */}
          <div className="flex flex-1 items-start justify-center">
            <Link
              href="/ai"
              aria-label="AI 도구"
              className={cn(
                'rm-ai-live relative -top-4 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_26px_-6px_rgba(99,102,241,0.65)] transition active:scale-95',
                'bg-gradient-to-br from-[#8E94F2] via-[#6366F1] to-[#7FB8EE]',
                isAiActive(pathname) && 'ring-4 ring-[#6366F1]/25',
              )}
            >
              <SparklesIcon className="h-7 w-7" />
            </Link>
          </div>

          {/* 우측: 직원, 더보기 */}
          <BottomLink href="/employees" label="직원" Icon={PeopleIcon} active={isStaffTabActive(pathname)} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="relative flex h-full min-w-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] text-[11px] font-medium text-slate-500 transition-all duration-150 active:scale-[0.94] active:bg-[#EEEEFD]/60"
          >
            <ChevronDownIcon className="h-[22px] w-[22px] rotate-180" strokeWidth={1.8} />
            <span className="leading-none">더보기</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function BottomLink({ href, label, Icon, active }: { href: string; label: string; Icon: Icon; active: boolean }) {
  return (
    <Link
      href={href}
      prefetch={active ? false : true}
      className={cn(
        'relative flex h-full min-w-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] text-[11px] transition-all duration-150 active:scale-[0.94] active:bg-[#EEEEFD]/60',
        active ? 'font-semibold text-[#6366F1]' : 'font-medium text-slate-500',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
      <span className="leading-none">{label}</span>
    </Link>
  );
}
