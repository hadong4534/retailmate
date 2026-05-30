# RetailMate 아키텍처 상세 분석

> 작성일: 2026-05-31 · 분석 기준: Vercel 배포 소스 복구본 + 라이브 Supabase 스키마(`mdvywgzjxfxlrnjbqmbu`)
> 목적: 대대적 리팩터링/재작성을 위한 전체 구조 파악 및 기술 부채 정리

---

## 1. 개요

**RetailMate**는 한국 소상공인(매장 사장님) 대상 **매장 운영 통합 관리 SaaS**다. 매출/지출 기록, 직원·급여 관리, GPS 출퇴근, 전자 근로계약서(전자서명+PDF), 공지, 그리고 AI 운영 비서(챗봇·인사이트·이미지 생성)를 하나의 모바일 우선 PWA로 묶었다.

- **규모**: TypeScript/TSX 약 24,500줄, 154개 코드 파일
- **배포**: Vercel (git 미연결 상태였으나 복구 완료), 도메인 `www.retailmate.io`
- **렌더링**: Next.js App Router — React Server Components(RSC) + Server Actions 중심, 클라이언트 상호작용은 `'use client'` 부분 hydration

---

## 2. 기술 스택 & 의존성

| 영역 | 사용 기술 | 버전/비고 |
|---|---|---|
| 프레임워크 | Next.js | **16.2.6** (App Router) |
| UI | React | 19.2.4 |
| 빌드러 | **Webpack 강제** | `next dev/build --webpack` — Turbopack(16 기본값) 명시적 비활성. 사유 미문서화(잠재 호환 이슈) |
| DB/Auth | Supabase | `@supabase/ssr` 0.10.3, `supabase-js` 2.105.4 |
| 스타일 | Tailwind CSS v4 | `@tailwindcss/postcss`, `tailwind.config` 없음 (CSS-first) |
| 검증 | zod 4 | **설치돼 있으나 실제 사용 안 함** — 모든 검증 수작업 |
| AI | OpenRouter | `anthropic/claude-sonnet-4.6`, `claude-haiku-4.5` (텍스트), `openai/gpt-5.4-image-2`·`google/gemini-3.x-image` (이미지) |
| PDF | pdf-lib + @pdf-lib/fontkit | NotoSansKR 폰트 jsDelivr CDN 런타임 fetch |
| Excel | exceljs | 월간 리포트 3시트 |
| 차트 | recharts | |
| 폼 | react-hook-form + @hookform/resolvers | (부분 사용) |
| 마크다운 | react-markdown + remark-gfm | AI 챗 렌더링 |
| SMS | Solapi(구 Coolsms) | HMAC-SHA256 인증 |
| 외부 | Daum/Kakao 우편번호, OSM Nominatim 지오코딩, Kakao OAuth | |

---

## 3. 디렉터리 구조

```
src/
├─ app/
│  ├─ layout.tsx                 # 루트 레이아웃 (PWA 메타, SW 등록, 스플래시)
│  ├─ page.tsx                   # 랜딩
│  ├─ (auth)/                    # 비인증 영역 (login, signup)
│  ├─ (app)/                     # 인증 대시보드 영역 (레이아웃이 게이트키퍼)
│  │  ├─ dashboard/ sales/ expenses/ attendance/
│  │  ├─ employees/ (+payroll) contracts/ (+new, nda)
│  │  ├─ notices/ reports/ settings/ stores/new/
│  │  └─ ai/ (chat, brand, drive, posters)
│  ├─ contracts/[id]/{sign,view}/  # 공개 서명 + 열람 (AppShell 밖)
│  ├─ employee/me/               # 직원 셀프뷰
│  ├─ onboarding/store/          # 첫 매장 등록
│  ├─ auth/callback/             # Supabase 네이티브 OAuth 콜백
│  └─ api/                       # ai/*, auth/*(kakao,phone,signup), contracts/[id]/pdf, reports/excel
├─ components/  ai/ app/ attendance/ auth/ charts/ common/ insights/ layout/ notices/ ui/
├─ lib/         ai/ auth/ contract/ employee/ insights/ notices/ payroll/ reports/ sms/ supabase/
├─ types/database.ts            # 수동 타입 (7개 테이블만 — 실제 21개와 불일치)
└─ proxy.ts                     # Next.js 미들웨어 (16에서 'proxy'로 명명)
docs/migrations/                # 016~020만 존재 (001~015 유실)
```

---

## 4. 데이터 모델 (라이브 Supabase: 21개 테이블)

> ⚠️ `src/types/database.ts`에는 **7개 테이블만** 정의돼 있어 실제 스키마(21개)와 크게 어긋남. 재작성 시 `supabase gen types`로 자동 생성 권장.

### 핵심 엔티티

- **profiles** (auth.users 1:1) — `role` enum `owner|employee|**manager**`(타입엔 manager 누락), `phone_verified`, `avatar_path`
- **stores** — 위치(`lat/lng/radius_m`), 영업시간, `monthly_target`, 급여설정(`wage_calc_mode`, `weekly_holiday_default`, `pay_day_default`, `tax_filing_mode`), **브랜드**(`business_name`, `logo_path`, `brand_color`, `brand_slogan`, `brand_description`)
- **store_members** — 매장↔직원 N:M, `role`, `hourly/monthly/daily_wage`, `hire_date/resign_date`, `is_active`, GPS/개인정보 동의 타임스탬프

### 운영 데이터

- **sales** (83행) — `channel` enum 6종, `amount` bigint
- **expenses** (1행) — `category` enum 8종, `item_name`, `payment_method`
- **attendances** (2행) — 체크인/아웃, GPS 좌표·거리, `work_minutes`(**generated column**: 분 단위 자동계산), `is_valid`
- **payrolls** (0행) — `base_pay/weekly_bonus/overtime_pay/night_pay/holiday_pay/deduction/total` — **스키마만 존재, 코드에서 미사용**
- **products / sale_items** (0행) — 상품·품목 단위 매출 → **미사용(미래 기능)**
- **work_schedules** (0행) — 근무 스케줄 → **미사용**

### 계약/동의

- **labor_contracts** (5행) — 단일 테이블에 fulltime/parttime/daily/nda 4종 + draft/sent/signed/terminated/cancelled 5상태. `sign_token`, 양측 서명 이미지·서명시각·IP·UA, `social_insurance` jsonb, `pdf_url`
- **contract_revisions** (0행) — 개정 이력 → 미사용
- **contract_templates** (4행) — 시스템 글로벌 템플릿 4종
- **consent_logs** (18행) — 약관/개인정보/GPS/마케팅 동의 감사 로그
- **phone_verifications** (9행) — SMS 인증코드(SHA-256 해시 저장, 시도 제한)

### AI / 알림

- **ai_usage_logs** (175행) — 토큰·비용 추적(`provider=openrouter`)
- **ai_images** (2행) — 비동기 이미지 생성(`status` pending/done/failed, `image_path`, `cost_usd`)
- **ai_insights** (0행) — 인사이트 캐시 → 미사용
- **notices / notice_reads** (0행) — 공지 + 읽음 추적, `target` enum `all|employees`
- **user_notification_prefs** (0행) — 알림 설정

### 🔴 스키마 중대 발견

1. **마이그레이션 019(NDA)·020(cancelled) 라이브 미적용**: 라이브 `labor_contracts.contract_type` enum에 `nda` 없음, `nda_retention_years/nda_info_scope` 컬럼 없음, `contract_status`에 `cancelled` 없음. **코드는 NDA·취소 기능을 호출하지만 DB가 받지 못함** → 런타임 오류 가능. (`docs/migrations/019,020`을 라이브에 실행 필요)
2. **타입 정의 13개 테이블 누락** — 컴파일은 통과하나 타입 안전성 사실상 없음.
3. **`payrolls/products/sale_items/work_schedules/ai_insights/contract_revisions` 6개 테이블이 코드 미연결** — 설계만 선반영된 미완성 영역.

---

## 5. 인증 & 세션 아키텍처

### Supabase 클라이언트 4종 (+ 인라인 변형)

| 변형 | 파일 | 사용처 |
|---|---|---|
| Browser | `lib/supabase/client.ts` | `'use client'` 컴포넌트 |
| Server | `lib/supabase/server.ts` | RSC/레이아웃/라우트 핸들러 |
| Admin(service role, **RLS 우회**) | `lib/supabase/admin.ts` | 서버 측 권한 우회 쓰기 |
| Proxy(middleware) | `lib/supabase/proxy.ts` | `proxy.ts` 미들웨어 전용 |

- **쿠키 400일 강제**: `@supabase/ssr`가 종종 `Max-Age`를 누락해 자동 로그인이 깨지는 문제 때문에, 4개 파일에서 `document.cookie`/응답쿠키를 **수동 조작**해 400일·`SameSite=Lax`·도메인스코프로 재기록. (중복·라이브러리 버전 결합도 높음)
- **`cookie-domain.ts`**: `*.retailmate.io`면 `Domain=retailmate.io`로 서브도메인 공유, 그 외(localhost/vercel.app)는 host-only.

### 인증 플로우 3종

1. **이메일+비밀번호 + SMS 인증 가입**: `phone/send`(코드 SHA-256 해시 저장, 분당 1회 제한) → `phone/verify`(5회 시도 제한) → `signup`(10분 내 인증 영수증 확인, 프로필 생성 실패 시 auth 유저 롤백)
2. **Kakao OAuth (커스텀)**: Supabase 기본 OAuth가 `account_email` 스코프 강제로 KOE205 실패 → 자체 `kakao/start`(nonce 쿠키) + `kakao/callback`(id_token **서명 미검증**, placeholder 이메일 `kakao_<id>@retailmate.local`, magiclink로 세션 발급)
3. **Supabase 네이티브 콜백** `auth/callback` — Kakao 플로우와 **병행 존재**(현재 Kakao는 안 거침 → 데드코드 위험)

### 미들웨어 (`proxy.ts`)

- `getClaims()`(로컬 JWT 검증, 네트워크 0) 우선 → 만료 시 `getUser()`로 refresh + 응답에 새 쿠키 기록(자동 로그인 유지)
- 공개 경로: `/`, `/login`, `/signup`, `/debug/`, `/contracts/*/sign`, **`/api/auth/` 전체**(SMS 라우트가 `/login`으로 307되던 버그 수정)
- 캐시 헤더 정책 전부 미들웨어에 집중(`Vary: Cookie`, BFCache 허용을 위한 `no-cache`)

### 멀티스토어 & 권한

- **`store-context.ts`** — `owner|manager|employee`, `isAdmin = owner||manager`. `rm_current_store` 쿠키로 현재 매장 선택, 없으면 owner 우선·이름순 fallback
- **`page-context.ts`** — `getClaims()` 기반 빠른 SSR 경로(페이지당 ~150ms 절감 주장). 단, `(app)/layout.tsx`는 더 느린 `getUser()` 사용 → **두 가지 신뢰 모델 혼재**

---

## 6. 기능별 상세

### 매출 (sales)
RSC에서 3쿼리 병렬(당월/전월/6개월) 후 JS 집계 — 일별/월별/결제수단별 뷰(`useState` 전환으로 재요청 회피). KPI: 일평균·최고일·카드비중·전월대비. **이슈**: 수정이 "전체 삭제 후 재삽입"(비원자적, admin client로 RLS 우회), **채널별 메모 유실**(공유 메모 1개만 저장).

### 대시보드 (dashboard)
KST 기준 10쿼리 병렬. `pickAIInsight` 우선순위 규칙엔진(G→A)으로 단일 인사이트+CTA. **이슈**: `loading.tsx` 스켈레톤이 현재 레이아웃과 불일치(stale).

### 지출 (expenses)
8개 카테고리 집계, 비용률(=지출/매출), 주간 버킷, 도넛. 영수증 업로드는 "곧 지원" 비활성. 삭제는 admin client지만 `store_id` 소유 재확인(올바름).

### 출퇴근 (attendance) + GPS
`GpsCheckWidget`이 geolocation(고정밀, 6자리 반올림) → `gpsCheckIn/Out`. Haversine 거리(`R=6371000`)가 `radius_m`(기본 100m) 초과 시 거부. **이슈**: (1) `gpsCheckIn` 중복 가드가 **서버 로컬시간** 사용(KST 불일치, 자정 부근 오류), (2) 체크아웃에 "당일" 제약 없음(전날 미체크아웃을 오늘이 닫음), (3) `distance_m` 미저장, 지각/조퇴 집계 하드코딩 0.

### 직원 (employees) + 급여 (payroll)
멤버 목록(owner 제외), 계약 기반 입사일, 예상 인건비 추정. 권한 액션 일부만 `authorize()` 호출(`updateMemberWage`·승진/강등은 RLS만 의존 → 불일치). **퇴사 = 하드 삭제**.

**급여 계산 (중요 — 단순 MVP)**:
- `insurance.ts` 4대보험 2026 요율: 국민연금 4.5%, 건강 3.545%, 장기요양 12.95%(건강보험액 기준), 고용 0.9%, 산재(사업주 부담 미계산). **정규직(fulltime)만** 공제, 시급/일용은 공제 0. `Math.floor` 절사.
- `store-payroll.ts`: 시급=`근무분/60×요율`, 월급=정액(중도 퇴사 미일할), 일급=`근무일×요율`. 순지급=총액−4대보험.
- 🔴 **주휴수당·연장·야간·휴일수당·소득세/지방세 전부 미구현**. `payrolls` 테이블 미사용(메모리 계산만). 페이지에 "참고용 추정" 면책 배너.

### 계약 (contracts) — 전자서명
단일 `labor_contracts` 재사용. 생성 시 사장이 선서명→`status:sent`, 직원 서명→`signed`. 공개 서명 링크 = `sign_token`(256bit, **만료 없음 정책**). 서명 플로우에서 가입/로그인/Kakao + 3개 동의(약관·개인정보 필수, GPS 선택) + IP/UA 캡처 → `store_members` upsert·`consent_logs` 기록·계약 업데이트·PDF 생성(best-effort). **이슈**:
- 🔴 **NDA 플로우 깨짐**: NDAWizard가 서명 URL을 `/{contractId}/sign?token=`로 잘못 생성(서명 페이지는 `sign_token`을 `[id]`로 조회) + 완료화면 가드 `res.expiresAt`이 null이라 미표시. + DB enum 미적용(§4).
- 🔴 **저장형 XSS**: `template.ts`가 사용자 입력을 이스케이프 없이 HTML 보간 → `view/page.tsx`에서 `dangerouslySetInnerHTML` 렌더.
- 가장 민감한 쓰기(insert/cancel/delete/sign) 전부 **service-role로 RLS 우회**, 권한은 앱코드에만 존재.
- PDF/HTML 법조문 **이중 관리**(두 소스), 폰트 미고정 CDN(`@main`) 런타임 의존.
- 서명 제출이 **트랜잭션 없이** 다중 쓰기 → 부분 실패 시 불일치.

### 리포트 (reports)
`getMonthlyReport`가 손익·채널별·카테고리별·일별 시계열(미래일 null) 집계. recharts 차트 + exceljs 3시트(손익요약/일별매출/비용명세).

### 인사이트 (insights)
`sales.ts`/`expenses.ts`/`rules.ts` — 하드코딩 임계값 규칙엔진(카드≥90%, 배달≥30%, 인건비≥40%, MoM±10% 등). 주석상 **추후 OpenRouter로 교체 예정 자리**. `insight-generator.ts`가 AI 호출, 실패 시 규칙엔진으로 우아하게 폴백.

### 공지 (notices)
역할 기반 가시성(`all` 전체 / `employees` 직원만). 로그인 시 `NoticePopup` 큐로 표시, `markNoticeRead` upsert(멱등).

### 설정 (settings)
5탭(매장/계정/알림/급여/보안). 주소검색→lat/lng 자동, GPS 반경 슬라이더(50–500m), 아바타 업로드(5MB, **구파일 미정리 누적**), 비밀번호 변경(현재 비번 재검증).

---

## 7. AI 서브시스템

- **`openrouter.ts`**: 비스트리밍 `complete()` 단일 게이트웨이. 모델별 비용 추정·`ai_usage_logs` fire-and-forget 기록. **이슈**: 타임아웃 기본 3000ms(주석은 5000), Sonnet엔 과도. `anonymize()`는 이름 마스킹 한다고 주석돼 있으나 실제론 전화/이메일만, 게다가 미사용.
- **AI 챗**: `chat-context.ts`가 7쿼리로 매장 컨텍스트(최근 14일 매출 등 집계만) → 시스템 프롬프트. `chat/route.ts`는 **게이트웨이를 우회해** 직접 SSE 스트리밍 파싱(불변식 깨짐, 로깅 중복). PII 보호는 "이름을 select 안 함"에만 의존(취약·미문서화).
- **AI 인사이트**: `dashboard-insight` 라우트가 **클라이언트가 보낸 지표(`body.input`)를 신뢰** → 변조 가능, 서버 산출로 바꿔야 함.
- **AI 이미지 (비동기)**: 🔴 **진짜 큐 없음**. `void runImageGeneration()` fire-and-forget은 Vercel에서 202 응답 후 함수 종료로 **중단될 수 있음**(코드 주석도 "큐 도입 필요" 명시). 클라 localStorage 큐 + `AIToastWatcher` 3초 폴링으로 상태 추적. → 재작성 1순위 신뢰성 이슈(QStash/Supabase 큐/cron 스윕 등).
- **브랜드**: `BrandClient`가 `brand_description`만 편집, **slogan/color UI는 데드코드**(스키마·프롬프트는 지원).

---

## 8. UI / 디자인 시스템

- **`AppShell.tsx`**: 셸 단일 소스. PC 다크네이비 사이드바(6그룹) + 모바일 상단바·하단탭(5). `/ai/chat`에서 하단탭 숨김(입력 가림 P0 수정), safe-area 처리.
- **디자인 토큰(`globals.css`)**: Tailwind v4 `@theme`, `--rm-*` 색·반경·그림자·z-index·모션. 카드 시스템(`.rm-card*`), AI 전용 애니메이션, `prefers-reduced-motion` 가드.
- **컴포넌트 라이브러리(`components/app/index.tsx`)**: `AppCard/MetricCard/PageHeader/DeltaChip/EmptyState` 등. 단, **AI 페이지 등 ~30+ 인라인 카드가 미마이그레이션**(DESIGN_SYSTEM.md §6 백로그). 아이콘 정책: 이모지 금지·단선 아이콘, 그라데이션은 AI 전용.
- **`ui-audit/REPORT.md`**: PC12+모바일13 스크린샷 감사. P0 일부 수정, P1/P2 다수 잔존(이름없음 직원, 통화 줄바꿈, 모바일 표 잘림, AI 모델명 노출 등).

---

## 9. 알려진 버그 & 기술 부채 (통합·우선순위)

### 🔴 P0 — 기능 깨짐 / 보안
1. **마이그레이션 019/020 라이브 미적용** → NDA·계약취소 DB 미지원
2. **NDA 서명 플로우 전체 깨짐** (URL 오생성 + 완료화면 미표시 + DB enum 부재)
3. **계약서 저장형 XSS** (`template.ts` 미이스케이프 + `dangerouslySetInnerHTML`)
4. **AI 이미지 생성 큐 부재** — Vercel에서 백그라운드 작업 유실 가능
5. **민감 쓰기 전반 service-role RLS 우회** — DB 차원 권한 보증 없음, 앱코드에만 의존

### 🟠 P1 — 정확성 / 신뢰성
6. KST vs 서버로컬 시간 혼재(출퇴근 중복가드, 직원 월범위 등) — 자정 부근 버그
7. 매출 수정 비원자적 삭제→삽입 + 채널별 메모 유실
8. 급여 계산 미완성(주휴/연장/야간/세금 없음), `payrolls` 테이블 미연결
9. 출퇴근: distance 미저장, 체크아웃 당일 제약 없음, 지각/조퇴 하드코딩 0
10. 권한 검사 불일치(`authorize` 호출 일부 누락, RLS만 의존)
11. AI 인사이트가 클라이언트 제공 지표 신뢰(변조 가능)

### 🟡 P2 — 구조 / 유지보수
12. 타입 정의 13개 테이블 누락 → 타입 안전성 사실상 없음
13. zod 미사용, 검증 전부 수작업(불균일)
14. 쿠키 400일 수동조작 4파일 중복, service-role 인스턴스화 산재
15. Kakao id_token 서명 미검증, placeholder 이메일 식별자, `findKakaoUserByEmail` O(전체유저)
16. 법조문(PDF/HTML)·비용상수(3곳)·차트 포매터·보험 라벨 중복
17. 데드코드: `RoleActions`, `auth/callback`(Kakao 미사용), brand slogan/color UI, `terminated`/`draft` 상태, `anonymize()`
18. 아바타/PDF Storage 구파일 미정리 누적
19. 외부 의존 비강화(Nominatim 정책/UA, 미고정 폰트 CDN, 하드코딩 URL)
20. 디자인시스템 마이그레이션 백로그 30+ 카드
21. 미사용 테이블 6종(products/sale_items/payrolls/work_schedules/ai_insights/contract_revisions)

---

## 10. 대대적 수정을 위한 권장사항

1. **DB 동기화 우선**: 라이브 스키마 ↔ 마이그레이션 ↔ 타입 일치화. `supabase gen types`로 타입 자동생성, 누락 마이그레이션 정리/적용. 마이그레이션 001~015 재구성(현재 유실).
2. **권한 모델 재설계**: service-role 우회 남용 제거 → RLS 정책을 owner/manager INSERT/UPDATE/DELETE까지 제대로 설계하고, 앱은 권한 우회 대신 RLS에 의존. 공통 "authorized mutation" 헬퍼 도입.
3. **검증 표준화**: zod 스키마를 서버 액션·API·폼에서 공유(클라/서버 단일 소스).
4. **시간 처리 통일**: KST 유틸 단일화, generated column과의 UTC 정합성 규칙 문서화.
5. **AI 이미지 파이프라인 견고화**: 진짜 큐(QStash/Supabase Queues/cron 스윕) + Realtime 구독으로 폴링 대체.
6. **계약 모듈 정비**: NDA 플로우 수정 또는 별도 테이블 분리, 법조문 단일 소스(서버 렌더+이스케이프), 폰트 번들 고정.
7. **급여 엔진 완성**: 주휴수당·연장/야간/휴일·간이세액 반영, `payrolls` 영속화, 트랜잭션화.
8. **트랜잭션 도입**: 서명 제출·매출 수정 등 다중 쓰기를 RPC(Postgres 함수)로 원자화.
9. **디자인시스템 수렴**: 인라인 카드 → `@/components/app` 통합, 감사 리포트 P1/P2 정리.
10. **빌드러 정상화**: Webpack 강제 사유 규명 후 Turbopack 복귀 검토(Next 16 표준).

---

*분석 방법: 복구 소스 154개 코드 파일 정독 + 라이브 Supabase 스키마 직접 조회. 본 문서는 재작성 설계의 출발점이며, 각 항목은 실제 코드/스키마 근거에 기반함.*
