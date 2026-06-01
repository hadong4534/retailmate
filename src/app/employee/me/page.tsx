import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/ui/Logo';
import { LogoutButton } from './LogoutButton';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { GpsCheckWidget } from '@/components/attendance/GpsCheckWidget';
import { getUserStoreContexts } from '@/lib/auth/store-context';
import { getUnreadNotices, getStoreNotices } from '@/lib/notices/queries';
import { getEmployeeOverview, formatHM } from '@/lib/employee/queries';
import { AvatarUploader } from './AvatarUploader';
import { formatWon } from '@/lib/utils';

export const metadata = {
  title: '내 정보 · 리테일메이트',
};

const TYPE_LABEL: Record<string, string> = {
  fulltime: '정규직',
  parttime: '파트타임',
  daily: '일용직',
};

const WAGE_LABEL: Record<string, string> = {
  hourly: '시급',
  monthly: '월급',
  daily: '일급',
};

const DAY_KO: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목',
  fri: '금', sat: '토', sun: '일',
};

export default async function EmployeeMePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, phone, avatar_path')
    .eq('id', user.id)
    .maybeSingle();

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    avatarUrl = supabase.storage.from('avatars').getPublicUrl(profile.avatar_path).data.publicUrl;
  }

  const overview = await getEmployeeOverview(supabase, user.id);

  // 첫 번째 매장 기준 GPS 위젯 데이터 (직원이 보통 1매장 소속)
  const primaryStoreId = overview.storeSummaries[0]?.storeId ?? null;
  let storeHasGps = false;
  let hasOpenAttendance = false;
  if (primaryStoreId) {
    const [{ data: storeRow }, { data: openMine }] = await Promise.all([
      supabase.from('stores').select('lat, lng').eq('id', primaryStoreId).maybeSingle(),
      supabase
        .from('attendances')
        .select('id')
        .eq('store_id', primaryStoreId)
        .eq('user_id', user.id)
        .is('check_out_at', null)
        .limit(1),
    ]);
    storeHasGps = storeRow?.lat != null && storeRow?.lng != null;
    hasOpenAttendance = (openMine ?? []).length > 0;
  }

  const contexts = await getUserStoreContexts(supabase, user.id);
  const roleMap = new Map(contexts.map((c) => [c.storeId, c.role]));
  const unread = await getUnreadNotices(supabase, user.id, roleMap);

  // 본인이 소속된 매장의 모든 공지(읽은 것 포함)
  const allNotices = (
    await Promise.all(
      overview.storeSummaries.map((s) => getStoreNotices(supabase, s.storeId)),
    )
  ).flat();
  allNotices.sort((a, b) => b.published_at.localeCompare(a.published_at));

  // 내 예정 근무 스케줄 (오늘 이후, 최대 8건)
  const todayKstStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const { data: myShifts } = await supabase
    .from('work_schedules')
    .select('schedule_date, start_time, end_time')
    .eq('user_id', user.id)
    .gte('schedule_date', todayKstStr)
    .order('schedule_date', { ascending: true })
    .limit(8);

  const monthLabel = `${new Date().getMonth() + 1}월`;

  return (
    <div
      className="relative min-h-screen overflow-hidden pb-20"
      style={{
        background:
          'radial-gradient(55% 32% at 12% 0%, rgba(129,140,248,0.14), transparent 60%),' +
          'radial-gradient(45% 30% at 100% 4%, rgba(127,184,238,0.12), transparent 60%),' +
          'linear-gradient(180deg,#F8F7FE 0%,#F4F6FB 100%)',
      }}
    >
      {unread.length > 0 && <NoticePopup notices={unread} />}

      <header
        className="relative border-b border-white/50 bg-white/70 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <span aria-hidden className="pointer-events-none absolute -left-6 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(142,148,242,0.20),transparent_70%)] blur-2xl" />
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="리테일메이트 홈"><Logo size="md" /></Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* 본인 정보 */}
        <div className="flex items-center gap-4">
          <AvatarUploader initialUrl={avatarUrl} name={profile?.name ?? user.email ?? '직원'} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {profile?.name ?? user.email} 님
              </h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                직원
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {profile?.phone && <span>{profile.phone}</span>}
              {profile?.email && <span className="ml-3">{profile.email}</span>}
            </p>
            <p className="mt-1 text-xs text-slate-400">프로필 사진을 등록하면 근무 현황에 표시돼요.</p>
          </div>
        </div>

        {/* 이번 달 요약 */}
        {overview.storeSummaries.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              label={`${monthLabel} 누적 근무`}
              value={formatHM(overview.totalWorkMinutes)}
              sub={`${overview.storeSummaries.length}개 매장 합산`}
              tone="blue"
            />
            <KpiCard
              label={`${monthLabel} 세전 급여`}
              value={formatWon(overview.totalGrossPay)}
              sub={overview.totalInsurance > 0 ? `4대보험 −${formatWon(overview.totalInsurance)}` : '4대보험 미적용'}
              tone="slate"
            />
            <KpiCard
              label={`${monthLabel} 실수령액`}
              value={formatWon(overview.totalNetPay)}
              sub="세전 − 4대보험 본인부담"
              tone="emerald"
            />
          </div>
        )}

        {/* 매장별 카드 */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900">소속 매장</h2>
          {overview.storeSummaries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E3E5F0] bg-white px-5 py-8 text-center text-sm text-slate-500">
              아직 소속된 매장이 없습니다. 사장님이 보내신 서명 링크를 통해 가입해주세요.
            </p>
          ) : (
            <ul className="space-y-3">
              {overview.storeSummaries.map((s) => (
                <li
                  key={s.storeId}
                  className="rounded-xl border border-[#EAECF5] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-900">{s.storeName}</p>
                      {s.contract ? (
                        <>
                          <p className="mt-1 text-xs text-slate-500">
                            {TYPE_LABEL[s.contract.contract_type]} ·{' '}
                            {s.contract.work_start_date} ~ {s.contract.work_end_date ?? '(정규)'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            근무 {s.contract.work_days.map((d) => DAY_KO[d] ?? d).join(', ')}{' '}
                            · {s.contract.work_start_time.slice(0, 5)}~{s.contract.work_end_time.slice(0, 5)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {WAGE_LABEL[s.contract.wage_type]} {formatWon(s.contract.wage_amount)}
                            {' · '}매월 {s.contract.pay_day}일 지급
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">계약서 정보 없음</p>
                      )}
                    </div>
                    {s.contract && (
                      <Link
                        href={`/contracts/${s.contract.id}/view`}
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        계약서 보기 →
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">{monthLabel} 근무</p>
                        <p className="mt-0.5 font-semibold text-slate-900">
                          {formatHM(s.monthly.workMinutes)}
                        </p>
                        {s.monthly.workDays > 0 && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {s.monthly.workDays}일 출근
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">세전 급여</p>
                        <p className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                          {formatWon(s.monthly.grossPay)}
                        </p>
                      </div>
                    </div>

                    {s.monthly.insurance.total > 0 && (
                      <div className="mt-3 space-y-1 border-t border-[#EAECF5] pt-3 text-xs">
                        <p className="font-medium text-slate-600">4대보험 본인부담</p>
                        {s.monthly.insurance.nationalPension > 0 && (
                          <Row label="국민연금 4.5%" value={`−${formatWon(s.monthly.insurance.nationalPension)}`} />
                        )}
                        {s.monthly.insurance.healthInsurance > 0 && (
                          <Row label="건강보험 3.545%" value={`−${formatWon(s.monthly.insurance.healthInsurance)}`} />
                        )}
                        {s.monthly.insurance.longTermCare > 0 && (
                          <Row label="장기요양 12.95%" value={`−${formatWon(s.monthly.insurance.longTermCare)}`} />
                        )}
                        {s.monthly.insurance.employmentInsurance > 0 && (
                          <Row label="고용보험 0.9%" value={`−${formatWon(s.monthly.insurance.employmentInsurance)}`} />
                        )}
                        <Row
                          label="공제 합계"
                          value={`−${formatWon(s.monthly.insurance.total)}`}
                          bold
                        />
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-[#EAECF5] pt-3">
                      <span className="text-xs font-medium text-slate-700">실수령액</span>
                      <span className="text-base font-bold text-emerald-600 tabular-nums">
                        {formatWon(s.monthly.netPay)}
                      </span>
                    </div>

                    {s.contract && s.contract.contract_type !== 'fulltime' && (
                      <p className="mt-2 text-[10px] text-slate-400">
                        {s.contract.contract_type === 'parttime' ? '파트타임(시급)' : '일용직'} — 4대보험 본인부담 미적용
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 내 근무 스케줄 */}
        {myShifts && myShifts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-slate-900">내 근무 스케줄</h2>
            <ul className="space-y-2">
              {myShifts.map((sh, i) => {
                const d = new Date(sh.schedule_date + 'T00:00:00');
                const dow = ['일','월','화','수','목','금','토'][d.getDay()];
                return (
                  <li key={i} className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
                    <span className="text-[14px] font-semibold text-slate-800">{d.getMonth() + 1}월 {d.getDate()}일 <span className="text-slate-400">({dow})</span></span>
                    <span className="rounded-full bg-[#EEF0FE] px-3 py-1 text-[13px] font-bold tabular-nums text-[#5961E6]">{String(sh.start_time).slice(0,5)} ~ {String(sh.end_time).slice(0,5)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 공지 */}
        {allNotices.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-slate-900">공지함</h2>
            <ul className="space-y-2">
              {allNotices.slice(0, 10).map((n) => (
                <li
                  key={n.id}
                  className={
                    'rounded-xl border bg-white p-4 ' +
                    (n.is_pinned ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-[#EAECF5]')
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.is_pinned && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                            고정
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{n.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{n.body}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        {new Date(n.published_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* GPS 출퇴근 위젯 — 직원도 사용 가능 */}
        {primaryStoreId && (
          <div className="mt-8">
            <GpsCheckWidget
              hasOpenAttendance={hasOpenAttendance}
              storeHasGps={storeHasGps}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function KpiCard({
  label, value, sub, tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'blue' | 'emerald' | 'slate';
}) {
  const colorClass =
    tone === 'blue' ? 'text-indigo-600'
    : tone === 'emerald' ? 'text-emerald-600'
    : 'text-slate-900';
  const cardBg =
    tone === 'blue' ? 'from-white to-[#F1F2FE]'
    : tone === 'emerald' ? 'from-white to-[#EFFAF5]'
    : 'from-white to-[#F7F8FB]';
  return (
    <div className={`rounded-xl border border-[#EAECF5] bg-gradient-to-br ${cardBg} p-5`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={'text-slate-600 ' + (bold ? 'font-medium' : '')}>{label}</span>
      <span className={'tabular-nums ' + (bold ? 'font-semibold text-slate-900' : 'text-slate-700')}>
        {value}
      </span>
    </div>
  );
}
