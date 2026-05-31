import type { SVGProps } from 'react';

/**
 * 빈 상태(empty state)용 미니 SVG 일러스트.
 * 모두 단색 line + 연한 채움. 80x80 정사각.
 * stroke="currentColor" 로 상위 텍스트 색상 따라감.
 */
type Props = SVGProps<SVGSVGElement>;

const baseProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 80 80',
  width: 64,
  height: 64,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** 매출/리포트 — 미니 라인 차트 wireframe */
export function EmptyChart(props: Props) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="8" y="14" width="64" height="48" rx="6" />
      {/* 점선 grid */}
      <line x1="8" y1="30" x2="72" y2="30" strokeDasharray="2 3" opacity="0.4" />
      <line x1="8" y1="46" x2="72" y2="46" strokeDasharray="2 3" opacity="0.4" />
      {/* 상승 라인 */}
      <path d="M 14 52 L 26 44 L 36 48 L 48 36 L 60 30 L 68 22" />
      {/* 점 */}
      <circle cx="68" cy="22" r="2" fill="currentColor" />
    </svg>
  );
}

/** 영수증/계약서 — 문서 wireframe */
export function EmptyDocument(props: Props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M 22 12 H 52 L 62 22 V 64 a 4 4 0 0 1 -4 4 H 22 a 4 4 0 0 1 -4 -4 V 16 a 4 4 0 0 1 4 -4 Z" />
      <path d="M 52 12 V 22 H 62" />
      <line x1="26" y1="34" x2="50" y2="34" opacity="0.5" />
      <line x1="26" y1="42" x2="54" y2="42" opacity="0.5" />
      <line x1="26" y1="50" x2="46" y2="50" opacity="0.5" />
      <line x1="26" y1="58" x2="42" y2="58" opacity="0.3" />
    </svg>
  );
}

/** 공지 — 메가폰 wireframe */
export function EmptyMegaphone(props: Props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M 14 36 L 14 50 L 22 50 L 22 36 Z" />
      <path d="M 22 30 L 56 18 L 56 60 L 22 50 Z" />
      <line x1="26" y1="55" x2="32" y2="66" />
      <circle cx="62" cy="32" r="2.5" opacity="0.5" />
      <circle cx="66" cy="40" r="2" opacity="0.4" />
      <circle cx="64" cy="48" r="2.5" opacity="0.5" />
    </svg>
  );
}

/** AI 드라이브 — 갤러리 wireframe */
export function EmptyGallery(props: Props) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="10" y="14" width="60" height="50" rx="4" />
      <circle cx="22" cy="28" r="3" opacity="0.6" />
      <path d="M 10 56 L 28 42 L 42 50 L 54 38 L 70 50" opacity="0.7" />
      <path d="M 10 64 L 70 64" opacity="0.4" strokeDasharray="2 2" />
    </svg>
  );
}

/** 직원 — 사람 아이콘들 */
export function EmptyPeople(props: Props) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="40" cy="28" r="8" />
      <path d="M 24 60 a 16 16 0 0 1 32 0" />
      <circle cx="22" cy="32" r="5" opacity="0.5" />
      <path d="M 12 56 a 10 10 0 0 1 20 0" opacity="0.5" />
      <circle cx="58" cy="32" r="5" opacity="0.5" />
      <path d="M 48 56 a 10 10 0 0 1 20 0" opacity="0.5" />
    </svg>
  );
}

/** 매출 입력 — 영수증 + 동전 */
export function EmptyReceipt(props: Props) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M 22 10 H 50 V 64 L 46 60 L 42 64 L 38 60 L 34 64 L 30 60 L 26 64 L 22 60 Z" />
      <line x1="28" y1="22" x2="44" y2="22" opacity="0.5" />
      <line x1="28" y1="30" x2="44" y2="30" opacity="0.5" />
      <line x1="28" y1="38" x2="38" y2="38" opacity="0.4" />
      <circle cx="58" cy="52" r="10" opacity="0.5" />
      <path d="M 58 47 V 57 M 54 52 H 62" opacity="0.5" />
    </svg>
  );
}
