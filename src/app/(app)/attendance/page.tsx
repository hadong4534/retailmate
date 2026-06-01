import Link from 'next/link';
import { Clock, CheckCircle2, AlertTriangle, DoorOpen, Timer, Moon, CalendarDays, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPageContext } from '@/lib/auth/page-context';
import { StaffHubCards } from '@/components/layout/StaffHubCards';
import { ChannelDonut } from '@/components/charts/ChannelDonut';
import { WeekBarChart } from '@/components/charts/WeekBarChart';
import { GpsCheckWidget } from '@/components/attendance/GpsCheckWidget';
import { ScheduleBoard } from './ScheduleBoard';
import { PageHeader } from '@/components/app';
import { formatHM } from '@/lib/employee/queries';
import { todayInKST } from '@/lib/utils';

interface AttRow {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  is_valid: boolean;
  work_minutes: number | null;
}

interface MemberRow {
  id: string;
  user_id: string;
  hourly_wage: number | null;
}

interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
  avatar_path: string | null;
  avatar_url?: string | null;
}

export const metadata = {
  title: '근태 현황 · 리테일메이트',
};

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ view?: string; month?: string }> }) {
  const supabase = await createClient();
  const ctx = await getPageContext(supabase);
  if (!ctx) return null;
  const store = { id: ctx.adminStore.storeId };

  const sp = await searchParams;
  const isSchedule = sp.view === 'schedule';
  if (isSchedule) {
    const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : todayInKST().slice(0, 7);
    const mStart = `${month}-01`;
    const mEnd = `${month}-${String(new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()).padStart(2,'0')}`;
    const [membersR, contractsR, schedR] = await Promise.all([
      supabase.from('store_members').select('user_id').eq('store_id', store.id).neq('role', 'owner').eq('is_active', true),
      supabase.from('labor_contracts').select('employee_id, invite_name, created_at').eq('store_id', store.id).order('created_at', { ascending: false }),
      supabase.from('work_schedules').select('user_id, schedule_date, start_time, end_time').eq('store_id', store.id).gte('schedule_date', mStart).lte('schedule_date', mEnd),
    ]);
    const memUserIds = Array.from(new Set((membersR.data ?? []).map((m) => m.user_id as string)));
    const inviteName = new Map<string, string>();
    (contractsR.data ?? []).forEach((c) => { if (c.employee_id && c.invite_name && !inviteName.has(c.employee_id)) inviteName.set(c.employee_id, c.invite_name); });
    let nameMap = new Map<string, string>();
    if (memUserIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', memUserIds);
      (profs ?? []).forEach((p) => { if (p.name && p.name.trim()) nameMap.set(p.id, p.name.trim()); });
    }
    const employees = memUserIds.map((uid) => ({ userId: uid, name: nameMap.get(uid) ?? inviteName.get(uid) ?? '직원' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    const shifts = (schedR.data ?? []) as { user_id: string; schedule_date: string; start_time: string; end_time: string }[];

    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">
          <StaffHubCards activeHref="/attendance" />
          <PageHeader Icon={Clock} tone="amber" title="근태 현황" description="실제 출퇴근과 예정 근무 스케줄을 한 곳에서." className="mb-4" />
          <AttendanceTabs view="schedule" />
          <ScheduleBoard month={month} employees={employees} shifts={shifts} />
        </div>
      </div>
    );
  }

  const today = new Date();
  // KST 기준 — UTC 처리 시 자정~09시에 today가 어제로 어긋나 출근 기록이 누락되는 문제 방지.
  const todayStr = todayInKST();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // 월요일

  // 매장 GPS 좌표 + 본인 미완료 출근 row
  const [{ data: storeRow }, { data: openMine }] = await Promise.all([
    supabase.from('stores').select('lat, lng').eq('id', store.id).maybeSingle(),
    supabase
      .from('attendances')
      .select('id')
      .eq('store_id', store.id)
      .eq('user_id', ctx.userId)
      .is('check_out_at', null)
      .limit(1),
  ]);
  const storeHasGps = storeRow?.lat != null && storeRow?.lng != null;
  const hasOpenAttendance = (openMine ?? []).length > 0;

  const [{ data: monthAtts }, { data: members }] = await Promise.all([
    supabase
      .from('attendances')
      .select('id, user_id, check_in_at, check_out_at, is_valid, work_minutes')
      .eq('store_id', store.id)
      .gte('check_in_at', monthStart.toISOString())
      .lte('check_in_at', monthEnd.toISOString())
      .order('check_in_at', { ascending: false }),
    supabase
      .from('store_members')
      .select('id, user_id, hourly_wage')
      .eq('store_id', store.id)
      .neq('role', 'owner')
      .eq('is_active', true),
  ]);

  const allAtts = (monthAtts ?? []) as AttRow[];
  const memberRows = (members ?? []) as MemberRow[];

  const userIds = Array.from(new Set(memberRows.map((m) => m.user_id)));
  const profileMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, phone, avatar_path')
      .in('id', userIds);
    (profiles ?? []).forEach((p) => {
      const row = p as ProfileRow;
      if (row.avatar_path) {
        row.avatar_url = supabase.storage.from('avatars').getPublicUrl(row.avatar_path).data.publicUrl;
      }
      profileMap.set(p.id, row);
    });
  }

  const totalMembers = memberRows.length;

  const todayAtts = allAtts.filter((a) => a.check_in_at.slice(0, 10) === todayStr);
  const checkedInToday = new Set(todayAtts.map((a) => a.user_id));
  const workingNow = todayAtts.filter((a) => !a.check_out_at);
  const offToday = totalMembers - checkedInToday.size;

  const completedAtts = allAtts.filter((a) => a.work_minutes != null);
  // 표본이 3건 미만이면 평균값이 들쭉날쭉해 의미가 없음 — 별도로 '데이터 부족' 처리
  const AVG_MIN_SAMPLE = 3;
  const hasEnoughAvgSample = completedAtts.length >= AVG_MIN_SAMPLE;
  const avgWorkMinutes = hasEnoughAvgSample
    ? Math.round(completedAtts.reduce((acc, a) => acc + (a.work_minutes ?? 0), 0) / completedAtts.length)
    : 0;

  const validAtts = todayAtts.filter((a) => a.is_valid);
  const statusCounts = {
    normal: validAtts.length,
    tardy: 0,
    early: 0,
    absent: offToday,
  };

  // 주간 출근
  const weekData: { dateKey: string; label: string; value: number; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const dayAtts = allAtts.filter((a) => a.check_in_at.slice(0, 10) === ds);
    weekData.push({
      dateKey: ds,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: new Set(dayAtts.map((a) => a.user_id)).size,
      isToday: ds === todayStr,
    });
  }

  // 5월 캘린더 데이터
  const monthCells: { date: number; count: number; isToday: boolean }[] = [];
  for (let d = 1; d <= monthEnd.getDate(); d++) {
    const ds = `${todayStr.slice(0, 8)}${String(d).padStart(2, '0')}`;
    const dayAtts = allAtts.filter((a) => a.check_in_at.slice(0, 10) === ds);
    monthCells.push({
      date: d,
      count: new Set(dayAtts.map((a) => a.user_id)).size,
      isToday: ds === todayStr,
    });
  }

  const donutData = [
    { name: '정상', value: statusCounts.normal, color: '#10b981' },
    { name: '지각', value: statusCounts.tardy, color: '#f59e0b' },
    { name: '조퇴', value: statusCounts.early, color: '#3b82f6' },
    { name: '결근', value: statusCounts.absent, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <StaffHubCards activeHref="/attendance" />

        <PageHeader
          Icon={Clock}
          tone="amber"
          title="근태 현황"
          description="직원 출퇴근과 근무 시간을 한눈에 확인하세요."
          className="mb-5"
        />

        <AttendanceTabs view="perf" />

        {/* GPS 출퇴근 위젯 */}
        <div className="mb-6">
          <GpsCheckWidget
            hasOpenAttendance={hasOpenAttendance}
            storeHasGps={storeHasGps}
          />
        </div>

        {/* KPI 4 */}
        <div className="rm-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            Icon={CheckCircle2}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            label="오늘 출근"
            value={`${checkedInToday.size}명`}
            sub={`전체 ${totalMembers}명 중 ${totalMembers > 0 ? Math.round((checkedInToday.size / totalMembers) * 100) : 0}%`}
          />
          <KpiCard
            Icon={AlertTriangle}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            label="지각"
            value={`${statusCounts.tardy}명`}
            sub="GPS 후 자동 집계"
          />
          <KpiCard
            Icon={DoorOpen}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            label="퇴근 완료"
            value={`${todayAtts.length - workingNow.length}명`}
            sub={`근무 중 ${workingNow.length}명`}
          />
          <KpiCard
            Icon={Timer}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            label="평균 근무시간"
            value={hasEnoughAvgSample ? formatHM(avgWorkMinutes) : '-'}
            sub={hasEnoughAvgSample ? '이번 달 완료된 출근 평균' : `표본 ${completedAtts.length}건 (3건 이상 필요)`}
          />
        </div>

        {/* 현재 근무 중 + 인사이트 */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-[#EAECF5] bg-white p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">현재 근무 중</h2>
              <span className="text-[10px] text-slate-400">{workingNow.length}명</span>
            </div>
            {workingNow.length === 0 ? (
              <div className="mt-3 flex flex-col items-center rounded-lg bg-slate-50 px-4 py-8 text-center">
                <Moon className="h-6 w-6 text-slate-400" strokeWidth={1.8} />
                <p className="mt-2 text-xs text-slate-500">현재 근무 중인 직원이 없습니다.</p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {workingNow.map((a) => {
                  const profile = profileMap.get(a.user_id);
                  const checkIn = new Date(a.check_in_at);
                  const elapsedMin = Math.floor((today.getTime() - checkIn.getTime()) / 60_000);
                  return (
                    <li key={a.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <MemberAvatar profile={profile} sizeClass="h-8 w-8" textClass="text-xs" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{profile?.name ?? '이름 미입력'}</p>
                          <p className="text-[10px] text-slate-500">
                            {checkIn.getHours().toString().padStart(2, '0')}:{checkIn.getMinutes().toString().padStart(2, '0')} 출근
                          </p>
                        </div>
                      </div>
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                        {formatHM(elapsedMin)} 근무
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#EAECF5] bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">근태 인사이트</h2>
            <ul className="mt-3 space-y-2 text-xs">
              {/* 미출근: 인원 있을 때만 amber accent. 없으면 차분한 slate. */}
              <li className="flex items-start gap-2.5 rounded-lg border border-[#EAECF5] bg-slate-50/60 p-3">
                <span className={
                  'mt-1 h-1.5 w-1.5 shrink-0 rounded-full ' +
                  (statusCounts.absent > 0 ? 'bg-amber-500' : 'bg-emerald-500')
                } aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {statusCounts.absent > 0 ? `오늘 미출근 ${statusCounts.absent}명` : '전원 출근 완료'}
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    {statusCounts.absent > 0 ? '직원에게 확인 연락을 보내보세요.' : '오늘은 모두가 정상 출근했어요.'}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5 rounded-lg border border-[#EAECF5] bg-slate-50/60 p-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    평균 근무 시간 {hasEnoughAvgSample ? formatHM(avgWorkMinutes) : '데이터 부족'}
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    {hasEnoughAvgSample
                      ? '이번 달 완료된 출근 기준 평균값이에요.'
                      : `완료된 출근이 ${completedAtts.length}건뿐이라 평균값이 흔들려요. 3건 이상 쌓이면 표시됩니다.`}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5 rounded-lg border border-[#EAECF5] bg-slate-50/60 p-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">이번 주 출근 인원</p>
                  <p className="mt-0.5 text-slate-600">
                    최근 7일 평균 {Math.round(weekData.reduce((acc, d) => acc + d.value, 0) / 7)}명
                  </p>
                </div>
              </li>
            </ul>
          </section>
        </div>

        {/* 주간 + 도넛 + 캘린더 */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">주간 출근 현황</h2>
            <p className="mt-0.5 text-[10px] text-slate-400">월~일 일별 출근 인원</p>
            <div className="mt-3">
              <WeekBarChart
                data={weekData.map((d) => ({ label: d.label, value: d.value, highlighted: d.isToday }))}
                color="#93c5fd"
                highlightColor="#7177EE"
                valueLabel="출근 인원"
                height={220}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">오늘 근태 분포</h2>
            {donutData.length === 0 ? (
              <p className="mt-3 rounded-md bg-slate-50 px-3 py-12 text-center text-xs text-slate-500">
                근태 데이터가 없습니다.
              </p>
            ) : (
              <div className="mt-3">
                <ChannelDonut
                  data={donutData}
                  centerLabel="전체"
                  centerValue={`${totalMembers}명`}
                  height={220}
                />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">{today.getMonth() + 1}월 근태 한눈에</h2>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {DAY_KO.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-slate-500">
                  {d}
                </div>
              ))}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthCells.map((c) => (
                <div
                  key={c.date}
                  className={
                    'flex aspect-square items-center justify-center rounded text-[10px] ' +
                    (c.isToday
                      ? 'bg-[#7177EE] font-bold text-white ring-2 ring-indigo-300'
                      : c.count >= 10
                      ? 'bg-emerald-500 text-white'
                      : c.count >= 6
                      ? 'bg-emerald-300 text-emerald-900'
                      : c.count >= 3
                      ? 'bg-emerald-100 text-emerald-700'
                      : c.count >= 1
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-slate-50 text-slate-400')
                  }
                  title={`${c.date}일: ${c.count}명 출근`}
                >
                  {c.date}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500">
              <Legend dot="bg-emerald-500" label="10명 이상" />
              <Legend dot="bg-emerald-300" label="6-9명" />
              <Legend dot="bg-emerald-100" label="3-5명" />
              <Legend dot="bg-slate-100" label="1-2명" />
            </div>
          </section>
        </div>

        {/* 오늘 근무 현황 — 모바일 카드 / PC 테이블 */}
        <section className="mt-6 rounded-2xl border border-[#EAECF5] bg-white">
          <h2 className="border-b border-[#EAECF5] px-5 py-3 text-sm font-semibold text-slate-900">
            오늘 근무 현황
          </h2>
          {memberRows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              등록된 직원이 없습니다.
            </p>
          ) : (
            <>
              {/* 모바일 카드 (lg 미만) */}
              <ul className="divide-y divide-slate-100 lg:hidden">
                {memberRows.map((m) => {
                  const profile = profileMap.get(m.user_id);
                  const att = todayAtts.find((a) => a.user_id === m.user_id);
                  const checkIn = att ? new Date(att.check_in_at) : null;
                  const checkOut = att?.check_out_at ? new Date(att.check_out_at) : null;
                  return (
                    <li key={m.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <MemberAvatar profile={profile} sizeClass="h-9 w-9" textClass="text-sm" />
                          <p className="truncate text-[14px] font-semibold text-slate-900">
                            {profile?.name ?? '이름 미입력'}
                          </p>
                        </div>
                        {!att ? (
                          <span className="whitespace-nowrap rounded bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">미출근</span>
                        ) : att.check_out_at ? (
                          <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">퇴근</span>
                        ) : (
                          <span className="whitespace-nowrap rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">근무 중</span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500">출근</p>
                          <p className="mt-0.5 whitespace-nowrap text-[13px] font-semibold tabular-nums text-slate-700">
                            {checkIn ? `${checkIn.getHours().toString().padStart(2, '0')}:${checkIn.getMinutes().toString().padStart(2, '0')}` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">퇴근</p>
                          <p className="mt-0.5 whitespace-nowrap text-[13px] font-semibold tabular-nums text-slate-700">
                            {checkOut ? `${checkOut.getHours().toString().padStart(2, '0')}:${checkOut.getMinutes().toString().padStart(2, '0')}` : att ? '근무 중' : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">총 근무</p>
                          <p className="mt-0.5 whitespace-nowrap text-[13px] font-semibold tabular-nums text-slate-700">
                            {att?.work_minutes ? formatHM(att.work_minutes) : '-'}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* PC 테이블 (lg+) */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">직원명</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">출근</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">퇴근</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">총 근무</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">위치</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {memberRows.map((m) => {
                      const profile = profileMap.get(m.user_id);
                      const att = todayAtts.find((a) => a.user_id === m.user_id);
                      const checkIn = att ? new Date(att.check_in_at) : null;
                      const checkOut = att?.check_out_at ? new Date(att.check_out_at) : null;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <MemberAvatar profile={profile} sizeClass="h-7 w-7" textClass="text-xs" />
                              <span className="font-medium text-slate-900">{profile?.name ?? '이름 미입력'}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {checkIn ? `${checkIn.getHours().toString().padStart(2, '0')}:${checkIn.getMinutes().toString().padStart(2, '0')}` : '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {checkOut ? `${checkOut.getHours().toString().padStart(2, '0')}:${checkOut.getMinutes().toString().padStart(2, '0')}` : att ? '근무 중' : '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {att?.work_minutes ? formatHM(att.work_minutes) : '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                            {att ? '매장 (정상)' : '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {!att ? (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">미출근</span>
                            ) : att.check_out_at ? (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">퇴근</span>
                            ) : (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">근무 중</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          위치 권한을 허용하고 매장 반경 안에서 출퇴근 버튼을 눌러주세요.
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  Icon, iconBg, iconColor, label, value, sub,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconBg: string; iconColor: string;
  label: string; value: string; sub: string;
}) {
  return (
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
}

function MemberAvatar({ profile, sizeClass, textClass }: {
  profile?: ProfileRow; sizeClass: string; textClass: string;
}) {
  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ${textClass} font-semibold text-slate-600`}>
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt={profile.name ?? ''} className="h-full w-full object-cover" />
      ) : (
        profile?.name?.charAt(0) ?? '?'
      )}
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded ${dot}`} />
      {label}
    </span>
  );
}

/** 실적(출퇴근) / 스케줄 탭 전환 */
function AttendanceTabs({ view }: { view: 'perf' | 'schedule' }) {
  const base = 'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition';
  return (
    <div className="mb-5 flex gap-1.5 rounded-2xl border border-[#EAECF5] bg-white p-1">
      <Link href="/attendance" className={base + (view === 'perf' ? ' bg-[#EEF0FE] text-[#5961E6]' : ' text-slate-500 hover:bg-slate-50')}>
        <BarChart3 className="h-4 w-4" /> 출퇴근 실적
      </Link>
      <Link href="/attendance?view=schedule" className={base + (view === 'schedule' ? ' bg-[#EEF0FE] text-[#5961E6]' : ' text-slate-500 hover:bg-slate-50')}>
        <CalendarDays className="h-4 w-4" /> 근무 스케줄
      </Link>
    </div>
  );
}
