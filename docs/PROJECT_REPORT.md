# RetailMate 프로젝트 종합 보고서

> 최종 업데이트: 2026-05-31 · 대상 독자: hadong(소유자) · 한 곳에서 전체 맥락을 보기 위한 마스터 문서
> 관련 문서: `ARCHITECTURE_ANALYSIS.md`(구조 분석) · `INPUT_FIELDS_AUDIT.md`(입력 UX) · `REDESIGN_PLAN.md`(리디자인) · `mockups/redesign_concepts.html`(시안)

---

## 1. 사장님의 비전 / 지시사항 (요청 정리)

1. **사이트 복구·재개발 기반 마련** — 로컬 폴더를 지웠고 Vercel 배포만 남은 상태에서 소스를 되살려 다시 수정 가능하게.
2. **전체 구조 정밀 파악** — 대대적 수정을 위해 앱 전체를 상세 분석.
3. **권장사항(리팩터링) 전부 처리** — DB 동기화→권한→검증 등 기반부터.
4. **계약서·서명·로그인 등 "구현은 됐지만 유연하게 연결 안 된" 흐름 정비.**
5. **모든 '빈칸(입력)' 데이터 전수조사** — 용도 파악 + 효율적 입력/수정/삭제로 재설계 (특히 매출 입력이 번거롭고 수정·삭제가 부실).
6. **요즘식 앱으로의 대대적 UI 개편** — PC·모바일 모두. **모바일에서 AI를 못 쓰는 문제 해결.** Higgsfield MCP + 이미지(gpt) 생성으로 필요한 이미지/영상/GIF 제작, 리디자인 시안 여러 개.
7. **사장님·직원 모두 아주 편하게, 모든 기능이 잘 작동.** 지속적 검증 필수.
8. 안전 우선: 운영 사이트이므로 **안전 브랜치 작업 → 확인 후 배포**, **DB 변경은 비파괴·확인 후**.

---

## 2. 지금까지 완료한 작업

### 2-1. 소스 복구 & GitHub 백업 ✅
- Vercel 배포(git 미연결)에서 **226개 파일 전부 복구** → 연결 폴더에 저장.
- 새 GitHub 저장소 `github.com/hadong4534/retailmate`에 푸시 완료(225개 트래킹). 표준 `.gitignore` 추가.
- Vercel ↔ GitHub 연결 완료(이제 push 시 자동 배포·preview 가능). `.env.local`은 Supabase 공개키 자동 채움 + 나머지 시크릿은 직접 입력 안내.

### 2-2. 전체 아키텍처 분석 ✅ → `ARCHITECTURE_ANALYSIS.md`
- Next.js 16 + React 19 + Supabase 풀스택 SaaS, TS/TSX 약 24,500줄/154파일.
- 라이브 Supabase 직접 조회: **21개 테이블** 확인(타입엔 7개만 있던 상태).
- 주요 발견: 마이그레이션 019/020 미적용, RLS는 실제로 잘 설계됨(정정), 계약 NDA 흐름 버그, 계약서 XSS 위험, AI 이미지 큐 부재, 급여 계산 미완성 등 P0~P2 정리.

### 2-3. Phase 1-1 — DB 동기화 + 타입 ✅ (검증 완료)
- 라이브 DB에 마이그레이션 적용(비파괴·확인 후): `contract_type += nda`, `contract_status += cancelled`, `labor_contracts += nda_retention_years/nda_info_scope`.
- `src/types/database.ts`를 **라이브 스키마와 일치**하도록 교체(manager 역할, 브랜드 필드, avatar_path/phone_verified, NDA 필드 반영) + 기존 import 호환.
- 영향받는 3개 파일(계약 미리보기 더미, 서명 열람 Profile 생성)도 새 필드에 맞춰 수정.

### 2-4. Phase 1-2 (착수) — 권한/보안 ◑
- **정정**: RLS 정책은 owner/manager/employee별로 잘 갖춰져 있고 `is_store_admin`이 owner를 포함. → 작업은 "RLS 재설계"가 아니라 **코드의 불필요한 service-role 우회 제거**로 재정의. 단, 상당수 우회는 "타인 profile 읽기"(RLS가 본인만 허용) 때문이라 신중히 진행 필요(런타임 검증=preview 배포).
- **DB 보안 하드닝 적용 ✅**: 헬퍼 함수 6종(`is_store_owner/admin/member`, `handle_new_user`, `normalize_phone`, `set_updated_at`)에 `search_path` 고정(advisor 경고 해소, 동작 변화 없음).
- 잔여 advisor(SECURITY DEFINER 뷰 2개, 익명 RPC EXECUTE, avatars 버킷 목록노출, 유출비번보호 off)는 사용처 확인 후 단계 처리 예정.

### 2-5. Phase 1-3 — 검증 표준화(zod) ◑
- 공유 검증 모듈 `src/lib/validation/schemas.ts` 신설(계약·NDA·매출·비용·공지·매장·직원 스키마 + `validateWith` 헬퍼).
- 계약 액션(`contracts/actions.ts`)의 수작업 검증을 zod로 교체(표준 패턴 확립). 나머지 액션은 점진 적용 예정.

### 2-6. 검증 ✅
- `tsc --noEmit` 통과(에러 0). **`next build --webpack` 전체 라우트 프로덕션 빌드 통과**(에러 0). 회귀 없음.

### 2-7. 입력 필드 전수조사 & 리디자인 기획 ✅
- `INPUT_FIELDS_AUDIT.md`: 13개 화면 입력 필드 표 + 매출 입력/수정/삭제 문제 정밀 분석 + 우선순위 개선안.
- `REDESIGN_PLAN.md` + `mockups/redesign_concepts.html`: 시안 3종(클린 SaaS / 다크 프리미엄 / 토스 스타일) × PC·모바일, 모바일 AI FAB 복구안, Higgsfield 활용 계획.

---

## 3. 환경 특이사항 (작업 방식)
- 연결된 OneDrive 폴더는 **편집 도구로 큰 파일(>~6KB)을 쓰면 끝부분이 잘리는** 현상이 있어, 모든 편집은 **샌드박스에서 작성·빌드 검증 후 안전 복사(bash)** 방식으로 진행. 이미 이 방식으로 모든 변경을 무손상 반영·검증함.
- 런타임(RLS/인증/모바일 실기)은 제가 직접 띄워 검증할 수 없으므로, **위험한 변경은 `refactor` 브랜치 → Vercel preview 배포 → 실기 테스트**로 검증하는 흐름을 권장.

## 4. 현재 상태
- 모든 변경분은 **로컬 `refactor` 브랜치**에만 있고 **아직 운영 배포 안 됨**.
- 라이브 DB에는 비파괴 마이그레이션(019/020 + search_path 하드닝)만 반영됨.

## 5. 다음 단계 로드맵 (권장 순서)
1. **모바일 AI 복구**(하단탭 재구성 + AI FAB) — 가장 시급·작음.
2. **매출 빠른입력 + 인라인 편집/비파괴 수정**(입력 감사서 A·B) — 사장님 핵심 페인 해소.
3. **리디자인 시안 택1** → 디자인 토큰/컴포넌트 수렴 → 화면별 점진 적용.
4. **Higgsfield/이미지 자산 생성**(방향 확정 후): 히어로 이미지(gpt) → 모션(Higgsfield).
5. **계약/서명/로그인 흐름 정비**(NDA URL 버그, 만료정책 통일, 서명 트랜잭션화, XSS 이스케이프).
6. **service-role 우회 정리 + 잔여 보안 advisor** — preview 검증과 병행.
7. **급여 엔진 보강**(주휴/연장/세금), 검증 표준화 확대, 디자인시스템 잔여 마이그레이션.
> 각 단계는 preview 배포로 모바일/PC 실기 검증을 반복합니다.

## 6. 사장님이 깨어나면 결정해 주실 것
- 리디자인 **시안 A/B/C 중 방향**(또는 혼합) — 이후 Higgsfield 이미지/영상 생성 착수.
- 다음 작업 우선순위(모바일 AI 먼저 vs 매출 입력 먼저) — 권장은 둘 다 1·2순위.
- `refactor` 브랜치 변경분을 preview로 띄워 확인할지.
