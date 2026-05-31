/**
 * 메뉴·UI용 line icon SVG 세트.
 * 모두 stroke 기반 currentColor — 부모 텍스트 색상에 따라 자동 적용.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 11 L12 3 L21 11 V20 a1 1 0 0 1 -1 1 H4 a1 1 0 0 1 -1 -1 Z" />
      <path d="M9 21 V13 H15 V21" />
    </svg>
  );
}

/** 매출 — 돈주머니 ₩ */
export function SalesIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 4 H15 L17.5 8 V19 a2 2 0 0 1 -2 2 H8.5 a2 2 0 0 1 -2 -2 V8 Z" />
      <path d="M9 4 L8 6" />
      <path d="M15 4 L16 6" />
      <path d="M9.5 12 L11 15.5 L12 13 L13 15.5 L14.5 12" />
    </svg>
  );
}

/** 비용 — 가격표 ₩ */
export function ExpensesIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M21 13 L13 5 H5 V13 L13 21 Z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
      <path d="M11 14 L12.5 17 L13.5 15 L14.5 17 L16 14" />
    </svg>
  );
}

/** 직원 관리 — 두 사람 */
export function PeopleIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20 a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M14 20 a4 4 0 0 1 8 0" />
    </svg>
  );
}

/** 근태 — 알람시계 */
export function ClockAlarmIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9 V13 L15 15" />
      <path d="M5 4 L7.5 6.5" />
      <path d="M19 4 L16.5 6.5" />
    </svg>
  );
}

/** 계약서 — 클립보드 */
export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 12 H15" />
      <path d="M9 16 H13" />
    </svg>
  );
}

/** 공지 — 확성기 */
export function MegaphoneIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 11 V13 H7 L18 19 V5 L7 11 Z" />
      <path d="M9 18 V20" />
    </svg>
  );
}

/** 리포트 — 막대 차트 */
export function BarChartIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="4" y="14" width="3" height="6" rx="0.5" />
      <rect x="10.5" y="9" width="3" height="11" rx="0.5" />
      <rect x="17" y="4" width="3" height="16" rx="0.5" />
    </svg>
  );
}

/** 설정 — 톱니바퀴 */
export function GearIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2 V5" />
      <path d="M12 19 V22" />
      <path d="M22 12 H19" />
      <path d="M5 12 H2" />
      <path d="M18.5 5.5 L16.5 7.5" />
      <path d="M7.5 16.5 L5.5 18.5" />
      <path d="M18.5 18.5 L16.5 16.5" />
      <path d="M7.5 7.5 L5.5 5.5" />
    </svg>
  );
}

/** 매장 추가 (+) */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 5 V19" />
      <path d="M5 12 H19" />
    </svg>
  );
}

/** 다운로드 화살표 */
export function DownloadIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 4 V16" />
      <path d="M7 11 L12 16 L17 11" />
      <path d="M5 20 H19" />
    </svg>
  );
}

/** 사용자 (직원 카드용) */
export function UserIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="9" r="4" />
      <path d="M4 21 a8 8 0 0 1 16 0" />
    </svg>
  );
}

/** 로그아웃 */
export function LogoutIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 21 H5 a2 2 0 0 1 -2 -2 V5 a2 2 0 0 1 2 -2 H9" />
      <path d="M16 17 L21 12 L16 7" />
      <path d="M21 12 H9" />
    </svg>
  );
}

/** 화살표 (드롭다운) */
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 9 L12 15 L18 9" />
    </svg>
  );
}

/** AI 챗봇 — 별 모양 */
export function SparklesIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 4 L13.5 9 L18.5 10.5 L13.5 12 L12 17 L10.5 12 L5.5 10.5 L10.5 9 Z" />
      <path d="M19 4 L19.7 6 L21.5 6.5 L19.7 7 L19 9 L18.3 7 L16.5 6.5 L18.3 6 Z" />
    </svg>
  );
}

/** 팁 — 전구 */
export function LightbulbIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 18 H15" />
      <path d="M10 21 H14" />
      <path d="M12 3 a6 6 0 0 1 4 10.5 c-1 0.7 -1.5 1.5 -1.5 2.5 V17 H9.5 v-1 c0 -1 -0.5 -1.8 -1.5 -2.5 A6 6 0 0 1 12 3 Z" />
    </svg>
  );
}

/** 더보기 — 점 3개 */
export function MoreIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
