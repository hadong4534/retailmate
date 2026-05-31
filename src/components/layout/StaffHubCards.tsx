import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { PeopleIcon, ClockAlarmIcon, ClipboardIcon, BarChartIcon } from '@/components/icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface HubItem {
  href: string;
  label: string;
  desc: string;
  Icon: Icon;
}

const ITEMS: HubItem[] = [
  { href: '/employees', label: '직원 목록', desc: '재직·퇴사 명부', Icon: PeopleIcon },
  { href: '/attendance', label: '출퇴근 현황', desc: '근무 시간', Icon: ClockAlarmIcon },
  { href: '/employees/payroll', label: '급여 계산', desc: '월별 명세', Icon: BarChartIcon },
  { href: '/contracts', label: '근로계약서', desc: '작성·서명', Icon: ClipboardIcon },
];

/** 모바일 직원 탭 허브: 4개 카드 네비게이션 (PC에서는 사이드바 그룹과 중복이라 hidden) */
export function StaffHubCards({ activeHref }: { activeHref?: string }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 lg:hidden">
      {ITEMS.map((item) => {
        const active = activeHref === item.href;
        const Icon = item.Icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              'flex items-center gap-3 rounded-xl border p-3 transition ' +
              (active
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-[#EAECF5] bg-white hover:bg-slate-50')
            }
          >
            <span
              className={
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md ' +
                (active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600')
              }
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className={
                'text-sm font-semibold ' + (active ? 'text-indigo-700' : 'text-slate-900')
              }>
                {item.label}
              </p>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
