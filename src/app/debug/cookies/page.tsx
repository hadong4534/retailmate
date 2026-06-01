import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * 자동로그인 디버깅용 페이지.
 * 현재 브라우저가 보낸 쿠키 목록 + Supabase auth 쿠키 존재 여부 표시.
 *
 * 사용법:
 *  1. /login에서 로그인 (자동로그인 체크)
 *  2. /debug/cookies 접속 → 쿠키 목록 확인 (sb-...-auth-token 같은 게 있어야 함)
 *  3. 브라우저 완전 종료
 *  4. 다시 열어 /debug/cookies 접속
 *  5. 같은 쿠키가 그대로 있으면 → 정상 (자동로그인 가능)
 *     사라졌으면 → Max-Age 미적용 (session-only 쿠키였음)
 */
export default async function CookiesDebugPage() {
  const store = await cookies();
  const all = store.getAll();

  const authCookies = all.filter((c) => c.name.startsWith('sb-'));
  const otherCookies = all.filter((c) => !c.name.startsWith('sb-'));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">쿠키 진단</h1>
      <p className="mt-2 text-sm text-slate-500">
        브라우저가 이 요청과 함께 서버로 보낸 쿠키 목록입니다.
      </p>

      <section className="mt-8 rounded-xl border border-[#EAECF5] bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">
          Supabase 인증 쿠키 ({authCookies.length}개)
        </h2>
        {authCookies.length === 0 ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Supabase 인증 쿠키가 없습니다. 로그인이 안 되어 있거나, 쿠키가 만료/삭제되었습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {authCookies.map((c) => (
              <li key={c.name} className="rounded-md bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-900">
                <strong>{c.name}</strong>
                <span className="ml-2 text-emerald-700">
                  (길이: {c.value.length}자)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-[#EAECF5] bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">
          기타 쿠키 ({otherCookies.length}개)
        </h2>
        <ul className="mt-3 space-y-1">
          {otherCookies.map((c) => (
            <li key={c.name} className="rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
              {c.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-bold text-amber-900">진단 방법</h2>
        <ol className="mt-2 list-decimal pl-5 text-sm text-amber-800 space-y-1">
          <li>위에 sb-... 인증 쿠키가 1~3개 보이면 → 로그인 OK</li>
          <li>브라우저 완전 종료</li>
          <li>다시 열어서 이 페이지 재방문</li>
          <li>같은 쿠키가 그대로 → 자동로그인 정상</li>
          <li>쿠키가 사라짐 → Max-Age 미적용</li>
        </ol>
      </section>

      <section className="mt-6 rounded-xl border border-[#EAECF5] bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">Chrome DevTools 확인 방법</h2>
        <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700 space-y-1">
          <li>F12 → Application 탭</li>
          <li>좌측 Storage → Cookies → https://retailmate.io 클릭</li>
          <li>sb-...-auth-token 행 클릭</li>
          <li>"Expires / Max-Age" 컬럼 확인 — &quot;Session&quot;이면 만료, 날짜가 나오면 유지</li>
        </ol>
      </section>
    </div>
  );
}
