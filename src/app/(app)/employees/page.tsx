import Link from 'next/link';
import { Users, Wallet, BarChart3, Bell, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPageContext } from '@/lib/auth/page-context';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/app';
import { formatWon, todayInKST, memberWageDisplay, kstTodayStartIso } from '@/lib/utils';
import { StaffHubCards } from '@/components/layout/StaffHubCards';
import { MemberActions } from './MemberActions';
import { WageEditor } from './WageEditor';
import { MemberList } from './MemberList';

interface MemberRow {
  id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'employee';
  hourly_wage: number | null;
  monthly_wage: number | null;
  daily_wage: number | null;
  hire_date: string | null;
  resign_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  avatar_url: string | null;
}

interface ContractRow {
  id: string;
  employee_id: string | null;
  contract_type: 'fulltime' | 'parttime' | 'daily' | 'nda';
  status: 'draft' | 'sent' | 'signed' | 'terminated';
  work_start_date: string;
  work_end_date: string | null;
  created_at: string;
  invite_name: string | null;
  invite_phone: string | null;
}

export const metadata = {
  title: '직원 관리 · 리테일메이트',
};

const ROLE_LABEL: Record<string, string> = {
  owner: '최고관리자',
  manager: '매니저',
  employee: '직원',
};

const STATUS_LABEL: Record<ContractRow['status'], { text: string; color: string }> = {
  draft: { text: '작성 중', color: 'bg-slate-100 text-slate-700' },
  sent: { text: '서명 대기', color: 'bg-amber-100 text-amber-700' },
  signed: { text: '서명 완료', color: 'bg-emerald-100 text-emerald-700' },
  terminated: { text: '종료', color: 'bg-slate-100 text-slate-500' },
};

export default async function EmployeesPage() {
  const supabase = await createClient();
  const ctx = await getPageContext(supabase);
  if (!ctx) return null;
  const store = { id: ctx.adminStore.storeId };

  // 실제 매장 사장의 user_id — store_members.role이 잘못 강등된 경우에도 직원 목록에서 제외하기 위함.
  const { data: storeRow } = await supabase
    .from('stores')
    .select('owner_id')
    .eq('id', store.id)
    .maybeSingle();
  const ownerUserId = storeRow?.owner_id ?? null;

  const today = new Date();
  // KST 기준 — 이번 달 신규 카운트 등의 비교가 자정~09시에 어긋나는 것 방지.
  const todayStr = todayInKST();
  const monthStart = todayStr.slice(0, 7) + '-01';

  const membersQuery = supabase
    .from('store_members')
    .select('id, user_id, role, hourly_wage, monthly_wage, daily_wage, hire_date, resign_date, is_active, created_at')
    .eq('store_id', store.id)
    .neq('role', 'owner')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });
  // 사장 본인이 잘못 employee로 등록된 row가 있어도 목록에서 제외.
  if (ownerUserId) membersQuery.neq('user_id', ownerUserId);

  const [membersRes, contractsRes, monthHiresRes, attTodayRes, staleOpenRes] = await Promise.all([
    membersQuery,
    supabase
      .from('labor_contracts')
      .select('id, employee_id, contract_type, status, work_start_date, work_end_date, created_at, invite_name, invite_phone')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('store_members')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .gte('hire_date', monthStart),
    supabase
      .from('attendances')
      .select('id, user_id, check_in_at, check_out_at')
      .eq('store_id', store.id)
      .gte('check_in_at', kstTodayStartIso()),
    // 퇴근 미처리(어제 이전에 출근했는데 안 닫힌 기록) — 근태 이상 알림에 사용
    supabase
      .from('attendances')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .is('check_out_at', null)
      .lt('check_in_at', kstTodayStartIso()),
  ]);

  const members = (membersRes.data ?? []) as MemberRow[];
  const contracts = (contractsRes.data ?? []) as ContractRow[];
  const newThisMonth = monthHiresRes.count ?? 0;
  const todayAttendances = attTodayRes.data ?? [];

  // profiles 별도 조회
  const userIds = Array.from(new Set(members.map((m) => m.user_id)));
  const profileMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, phone, email, avatar_url')
      .in('id', userIds);
    (profiles ?? []).forEach((p) => profileMap.set(p.id, p as ProfileRow));
  }

  // 최근 계약서 매핑 (계약 유형 표시 등 일반 용도 — created_at 가장 최근).
  // NDA는 직원 목록의 "역할/계약" 표시에 의미가 없으므로 제외.
  const latestContract = new Map<string, ContractRow>();
  contracts.forEach((c) => {
    if (c.employee_id && c.contract_type !== 'nda' && !latestContract.has(c.employee_id)) {
      latestContract.set(c.employee_id, c);
    }
  });

  // 재직 시작일 매핑 — NDA 제외, 같은 직원에게 여러 근로계약이 있으면 가장 빠른 work_start_date 사용.
  // 이 값이 "재직 기간"의 시작일이 됨. 이전엔 latestContract.work_start_date를 그대로 썼는데,
  // 그 결과 같은 직원에게 새 계약이 추가되면 가장 최근 계약의 시작일이 잡혀 입사일이 미래로 밀려 보였음.
  const laborStartByEmployee = new Map<string, string>();
  contracts.forEach((c) => {
    if (!c.employee_id || c.contract_type === 'nda') return;
    const cur = laborStartByEmployee.get(c.employee_id);
    if (!cur || c.work_start_date < cur) {
      laborStartByEmployee.set(c.employee_id, c.work_start_date);
    }
  });

  // KPI 집계
  const active = members.filter((m) => m.is_active && !m.resign_date);
  const inactive = members.filter((m) => !m.is_active || m.resign_date);
  const fulltimeCount = active.filter((m) => latestContract.get(m.user_id)?.contract_type === 'fulltime').length;
  const partCount = active.length - fulltimeCount;

  const workingNow = todayAttendances.filter((a) => !a.check_out_at).length;
  // 출근했던 사람(퇴근 포함) — '미출근' 계산용
  const checkedIn = new Set(todayAttendances.map((a) => a.user_id));
  // 지금 근무 중인 사람 — '출근중' 배지는 반드시 이걸 사용 (퇴근하면 즉시 해제)
  const workingNowSet = new Set(todayAttendances.filter((a) => !a.check_out_at).map((a) => a.user_id));
  const staleOpenCount = staleOpenRes.count ?? 0; // 퇴근 미처리(과거 미퇴근) 기록 수
  const offCount = active.length - checkedIn.size;

  // 평균 시급 + 인건비 예상 (active만)
  const wagedMembers = active.filter((m) => m.hourly_wage && m.hourly_wage > 0);
  const avgWage = wagedMembers.length > 0
    ? Math.round(wagedMembers.reduce((acc, m) => acc + (m.hourly_wage ?? 0), 0) / wagedMembers.length)
    : 0;

  // 이번 달 인건비 예상 — 정규직 월급 + 알바 시급 × 평균 근무시간 추정 (근태 없으니 단순 추정)
  const expectedLabor = active.reduce((acc, m) => {
    if (m.monthly_wage) return acc + m.monthly_wage;
    if (m.hourly_wage) return acc + m.hourly_wage * 160; // 월 160시간 가정
    if (m.daily_wage) return acc + m.daily_wage * 22;
    return acc;
  }, 0);

  // 오늘 출근 현황
  const totalActive = active.length;
  const presentCount = checkedIn.size;
  const leftCount = Math.max(0, presentCount - workingNow); // 출근 후 퇴근한 인원

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <StaffHubCards activeHref="/employees" />

        {/* 헤더 */}
        <PageHeader
          Icon={Users}
          tone="violet"
          title="직원 관리"
          description="직원 정보와 근무 현황을 관리하세요."
          right={
            <Link href="/contracts/new">
              <Button size="sm">+ 직원 추가</Button>
            </Link>
          }
          className="mb-5"
        />

        {/* 상단 KPI */}
        <div className="rm-stagger grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-[#EAECF5] bg-white p-5 lg:col-span-1">
            <p className="text-xs text-slate-500">전체 직원</p>
            <p className="mt-1 text-3xl font-bold text-indigo-600">{members.length}명</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <SmallStat label="정규직" value={`${fulltimeCount}명`} />
              <SmallStat label="아르바이트" value={`${partCount}명`} />
              <SmallStat label="현재 근무 중" value={`${workingNow}명`} />
              <SmallStat label="이번 달 신규" value={`${newThisMonth}명`} />
            </div>
          </div>
          <KpiCard
            Icon={Wallet}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            label="평균 시급"
            value={avgWage > 0 ? formatWon(avgWage) : '미설정'}
            sub={wagedMembers.length > 0 ? `${wagedMembers.length}명 평균` : '시급 입력 필요'}
          />
          <KpiCard
            Icon={BarChart3}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            label="이번 달 인건비 예상"
            value={formatWon(expectedLabor)}
            sub="추정치 · 시급제는 월 160시간 가정"
          />
          <KpiCard
            Icon={Bell}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            label="근태 이상 알림"
            value={`${staleOpenCount}건`}
            sub={staleOpenCount === 0 ? '정상' : '퇴근 미처리 기록 — 확인 필요'}
            href="/attendance"
          />
        </div>

        {/* 주요 직원 + 출근 현황 */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-[#EAECF5] bg-white p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">주요 직원 현황</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {active.slice(0, 6).map((m) => {
                const profile = profileMap.get(m.user_id);
                const contract = latestContract.get(m.user_id);
                const working = workingNowSet.has(m.user_id);
                const attendedToday = checkedIn.has(m.user_id);
                const displayName =
                  (profile?.name && profile.name.trim()) ||
                  (contract?.invite_name && contract.invite_name.trim()) ||
                  null;
                const displayPhone =
                  (profile?.phone && profile.phone.trim()) ||
                  (contract?.invite_phone && contract.invite_phone.trim()) ||
                  null;
                return (
                  <div key={m.id} className="rounded-lg border border-[#EAECF5] p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                        {displayName?.charAt(0) ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {displayName ?? '이름 미입력'}
                          </p>
                          <span className={
                            'rounded-full px-1.5 py-0.5 text-[9px] font-medium ' +
                            (working
                              ? 'bg-emerald-100 text-emerald-700'
                              : attendedToday
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'bg-slate-100 text-slate-500')
                          }>
                            {working ? '● 근무중' : attendedToday ? '퇴근' : '○ 미출근'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {contract ? (contract.contract_type === 'fulltime' ? '정규직' : contract.contract_type === 'parttime' ? '파트타임' : '일용직') : ROLE_LABEL[m.role]}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                      {(() => { const w = memberWageDisplay(m); return <p>{w.label} · {w.value}</p>; })()}
                      {displayPhone && <p>{formatKoreanPhone(displayPhone)}</p>}
                    </div>
                  </div>
                );
              })}
              {active.length === 0 && (
                <p className="col-span-full rounded-md border border-dashed border-[#E3E5F0] px-4 py-8 text-center text-xs text-slate-500">
                  재직 중인 직원이 없습니다.
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col rounded-xl border border-[#EAECF5] bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">오늘 출근 현황</h2>
            {totalActive === 0 ? (
              <p className="mt-3 text-xs text-slate-500">직원이 없습니다.</p>
            ) : presentCount === 0 ? (
              <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-lg bg-slate-50 px-4 py-6 text-center">
                <Clock className="h-6 w-6 text-slate-400" strokeWidth={1.8} />
                <p className="mt-2 text-xs text-slate-500">아직 오늘 출근한 직원이 없습니다.</p>
              </div>
            ) : (
              <div className="mt-2 flex flex-1 flex-col items-center justify-center gap-4">
                <AttendanceRing present={presentCount} total={totalActive} />
                <div className="w-full space-y-1.5 text-xs">
                  <Stat dot="bg-emerald-500" label="근무 중" value={`${workingNow}명`} />
                  <Stat dot="bg-indigo-400" label="퇴근" value={`${leftCount}명`} />
                  <Stat dot="bg-slate-300" label="미출근" value={`${offCount}명`} />
                </div>
              </div>
            )}
            <Link
              href="/attendance"
              className="mt-4 block border-t border-[#F0F1F8] pt-3 text-right text-[11px] font-medium text-indigo-600 hover:underline"
            >
              근태 현황 보기 →
            </Link>
          </section>
        </div>

        {/* 직원 목록 — 재직/퇴사 탭 + 입사·퇴사일 명확 표시 (MemberList 클라이언트 컴포넌트) */}
        <MemberList
          members={[...active, ...inactive].map((m) => {
            const profile = profileMap.get(m.user_id);
            const contract = latestContract.get(m.user_id) ?? null;
            // profile.name이 비어 있어도 계약서 invite_name이 있으면 그걸 표시 (자연스러운 이어짐).
            const displayName =
              (profile?.name && profile.name.trim()) ||
              (contract?.invite_name && contract.invite_name.trim()) ||
              null;
            const displayPhone =
              (profile?.phone && profile.phone.trim()) ||
              (contract?.invite_phone && contract.invite_phone.trim()) ||
              null;
            return {
              id: m.id,
              user_id: m.user_id,
              role: m.role,
              hourly_wage: m.hourly_wage,
              monthly_wage: m.monthly_wage,
              daily_wage: m.daily_wage,
              // 재직 기간은 NDA 제외 가장 빠른 근로 시작일 우선. 없으면 store_members.hire_date.
              hire_date: laborStartByEmployee.get(m.user_id) ?? m.hire_date,
              resign_date: m.resign_date,
              is_active: m.is_active,
              name: displayName,
              phone: displayPhone ? formatKoreanPhone(displayPhone) : displayPhone,
              // NDA는 위에서 이미 제외했으므로 contract_type은 fulltime/parttime/daily 셋 중 하나로 안전.
              contract: contract && contract.contract_type !== 'nda'
                ? { contract_type: contract.contract_type as 'fulltime' | 'parttime' | 'daily', status: contract.status }
                : null,
            };
          })}
        />
      </div>
    </div>
  );
}

function KpiCard({
  Icon, iconBg, iconColor, label, value, sub, href,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconBg: string; iconColor: string;
  label: string; value: string; sub: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

/** 출근율 도넛 링 — 가운데 N/M, 아래 출근율 % */
function AttendanceRing({ present, total }: { present: number; total: number }) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * c;
  return (
    <svg viewBox="0 0 110 110" className="h-[112px] w-[112px]" role="img" aria-label={`출근율 ${pct}%`}>
      <defs>
        <linearGradient id="attRingG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A5AEF9" />
          <stop offset="1" stopColor="#7177EE" />
        </linearGradient>
      </defs>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#EEF0F8" strokeWidth="10" />
      <circle cx="55" cy="55" r={r} fill="none" stroke="url(#attRingG)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform="rotate(-90 55 55)" />
      <text x="55" y="53" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1E2333">{present}/{total}</text>
      <text x="55" y="71" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#8A90A6">출근율 {pct}%</text>
    </svg>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1.5">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Stat({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-slate-600">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

/**
 * 한국 전화번호 하이픈 포맷 (서버 전용 복사본).
 * components/ui/PhoneInput.tsx의 formatKoreanPhone과 동일 로직 —
 * PhoneInput은 'use client' 모듈이라 서버 컴포넌트에서 직접 호출하면
 * 런타임 에러("Attempted to call ... from the server")가 발생해 분리함.
 */
function formatKoreanPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';

  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  const areaLen = 3;
  if (digits.length <= areaLen) return digits;
  if (digits.length <= 7) return `${digits.slice(0, areaLen)}-${digits.slice(areaLen)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, areaLen)}-${digits.slice(areaLen, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, areaLen)}-${digits.slice(areaLen, 7)}-${digits.slice(7, 11)}`;
}
