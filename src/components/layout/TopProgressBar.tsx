'use client';

import { usePathname } from 'next/navigation';

/**
 * 페이지 전환 시 화면 최상단에 파란 진행바를 잠깐 노출.
 * pathname이 바뀌면 600ms 동안 표시 → 사용자에게 "탭이 눌렸다"는 즉시 피드백.
 *
 * Next.js 16 App Router는 클라이언트 라우팅이 매우 빨라서 보통 100ms 이내에
 * 새 페이지가 그려지지만, 그래도 "뭔가 일어났다"는 시각 신호가 필요하다.
 */
export function TopProgressBar() {
  const pathname = usePathname();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[200] h-[3px] w-full overflow-hidden"
    >
      <div
        key={pathname}
        className="rm-top-progress h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500"
      />
    </div>
  );
}
