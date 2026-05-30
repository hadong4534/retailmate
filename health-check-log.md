# 리테일메이트 자동 헬스 체크 로그

> 사용자 부재 중 30분 간격 자동 점검 — 코드 수정 금지, 보고만.
> "수정 시작" 지시 전까지는 절대 코드를 건드리지 않는다.

---

## 점검 #1 — 2026-05-12 (1차 점검)

### 전체 상태
🟡 **주의** — 기능 동작 정상, PWA Service Worker 등록에 영향 가능한 미들웨어 설정 1건 발견.

### 빌드 결과
- TypeScript `tsc --noEmit`: **0 error**
- `npm run build`: 이번 회차 생략 (dev 서버 가동 중, 메모리 룰 "빌드와 dev 동시 실행 금지" 준수)
- 직전 배포 시점 build는 30개 라우트 정상 생성 확인됨

### 런타임 오류
- 브라우저 자동화는 데이터 영향 우려로 생략 (사용자 정책 "데이터 대량 생성/삭제 금지")
- dev 서버: `:3000` LISTENING, PID 47628 — 정상 가동
- 운영 SSR 응답:
  - `GET https://www.retailmate.io/` → **200 OK** (TTFB 1.27s, cold)
  - `GET https://www.retailmate.io/sales` → **307 → /login?redirect=...** (인증 미들웨어 정상)
  - 응답 헤더: `Cache-Control: private, no-store, must-revalidate`, `Vary: Cookie` — CDN 캐시 차단 패치 적용 상태 유지

### 모바일 UI 문제
- 코드 점검: AppShell 모바일 헤더에 `padding-top: env(safe-area-inset-top)` 적용 확인 — PWA 노치 회피 정상
- 하단 탭바 `h-[68px]` + `pb-[calc(68px+safe-area)]` 페이지 padding 정상
- AI 챗 페이지: 탭바 숨김 분기 (`HIDE_MOBILE_TABBAR_PREFIXES`) 정상
- 실측은 다음 회 사용자 요청 시

### PC UI 문제
- 정적 점검 — 코드 변경 사항 없음, 직전 배포 시점 빌드 정상

### 기능 접근 문제
- 인증 미들웨어 정상 (보호 라우트 redirect 응답 확인)
- 로그인 폼 코드 무변경 (점검 불가는 비밀번호 없는 환경 때문)

### 보안 / 민감정보 로그 문제
- `console.log` 안에 password/token/api-key/secret/email/phone 검출: **없음**
- 서버 키(`SUPABASE_SERVICE_ROLE_KEY`, `KAKAO_REST_API_KEY`, `SOLAPI_API_SECRET`, `OPENROUTER_API_KEY`) 사용처 11곳 — 모두 서버 라우트(`route.ts`) 또는 admin client (`src/lib/supabase/admin.ts`)로 한정. 클라이언트 번들 노출 없음

### PWA / 배포 자산
| 자산 | 로컬 | 운영 응답 |
|------|------|-----------|
| `public/sw.js` | ✅ | **🟡 307 redirect** — 미들웨어 matcher가 `/sw.js`를 제외 안 함 |
| `public/site.webmanifest` | ✅ | ✅ 200 OK |
| `public/apple-touch-icon.png` | ✅ | (matcher에서 png 제외 — 정상) |
| `public/favicon.ico` | ✅ | (matcher에서 ico 제외 — 정상) |

### ⚠ 핵심 발견: Service Worker가 인증 redirect됨
- 증상: `GET /sw.js` → `307 → /login` (운영 응답 헤더 직접 확인)
- 원인 추정: [src/proxy.ts](src/proxy.ts) 의 matcher 정규식이 `_next/static, favicon.ico, manifest.json, site.webmanifest, robots.txt, sitemap.xml, *.(svg|png|jpg|...|webmanifest)$` 만 제외 → `sw.js`는 매치되어 미들웨어 통과 시도 → 비로그인 상태에서 `/login`으로 redirect
- 영향:
  - 비로그인 사용자(랜딩 방문자)는 SW 등록 자체가 실패 가능
  - 로그인 사용자는 정상 (쿠키 있으니 redirect 안 됨)
  - PWA 첫 설치 시 영향이 있을 수 있고, 오프라인 캐시·앱 like 동작이 일관되지 않을 수 있음
- 심각도: **P0** (PWA 핵심 기능 침해)
- ⚠ 수정 제안만 작성, 임의 수정 금지:
  - matcher 정규식 끝의 `(?:svg|png|...|webmanifest)$` 사이에 `js`를 추가하면 모든 .js 가 빠지므로 부적절
  - 대안 권장: 특정 파일명만 명시적 제외 → `(?:...|webmanifest|js)$` 가 아니라, `sw\\.js` 또는 `/sw.js` 정확히 매치 제외
  - 또는 미들웨어 안에서 `pathname === '/sw.js'` 일 때 즉시 `NextResponse.next()` 반환 후 `Cache-Control` 헤더 정상화

### 데이터 없음 상태 점검
- 코드 점검 (변경 없음):
  - 매출/비용/공지/계약서 모두 EmptyState 또는 빈 상태 카드 분기 존재 확인됨
  - 홈 KPI에 `emptyCta`(`+ 매출 입력` 등) prop으로 인라인 CTA 노출 정책 유지
  - AI 인사이트 0건 시 "데이터가 더 쌓이면 AI 인사이트가 시작됩니다" 카피 노출

### 수정 필요 우선순위
| 우선순위 | 항목 |
|----------|------|
| **P0** | `/sw.js`가 인증 미들웨어에 의해 307 redirect — PWA Service Worker 등록 영향 가능 |

### 다음 조치 제안 (사용자 승인 후)
1. `src/proxy.ts` matcher에 `/sw.js` 명시적 제외 추가 (1줄 변경)
2. 또는 미들웨어 함수 진입 시점에 `pathname === '/sw.js'` 분기로 즉시 통과
3. 수정 후 재배포 → `curl -I https://www.retailmate.io/sw.js`로 `200 OK`(Content-Type: text/javascript) 확인

### 이번 점검에서 수행한 작업
- ✅ TypeScript 검사
- ✅ dev 서버 상태 확인
- ✅ 운영 응답 헤더 검사 (랜딩, /sales)
- ✅ 민감정보 grep (console.log + 환경변수 클라이언트 노출)
- ✅ PWA 자산 4종 존재 + 운영 서빙 확인
- ❌ 브라우저 자동화 (정책상 생략)
- ❌ 빌드 (dev 가동 중이라 생략)

---
