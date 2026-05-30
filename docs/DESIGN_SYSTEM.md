# 리테일메이트 디자인 시스템

> 모든 페이지가 같은 제품처럼 보이게 하는 단일 진실의 원천.
> 새 화면을 만들 때는 **이 가이드의 토큰과 컴포넌트만 사용**한다.

작성일: 2026-05-11

---

## 1. 디자인 토큰

위치: [src/app/globals.css](src/app/globals.css) `:root` 블록.

### 색상

| 의미 | 변수 | HEX |
|------|------|-----|
| primary | `--rm-primary` | `#2563EB` |
| primaryHover | `--rm-primary-hover` | `#1D4ED8` |
| primarySoft | `--rm-primary-soft` | `#EFF6FF` |
| navy (textPrimary) | `--rm-navy` / `--rm-text-primary` | `#0F172A` |
| navyCard (AI 카드) | `--rm-navy-card` | `#111827` |
| background | `--rm-bg` | `#F6F8FB` |
| surface | `--rm-surface` | `#FFFFFF` |
| surfaceSoft | `--rm-surface-soft` | `#F8FAFC` |
| border | `--rm-border` | `#E2E8F0` |
| textSecondary | `--rm-text-secondary` | `#64748B` |
| textMuted | `--rm-text-muted` | `#94A3B8` |
| success | `--rm-success` | `#10B981` |
| warning | `--rm-warning` | `#F59E0B` |
| danger | `--rm-danger` | `#EF4444` |
| purple | `--rm-purple` | `#8B5CF6` |
| cyan | `--rm-cyan` | `#38BDF8` |

> Tailwind 클래스로 직접 표현 가능한 색은 `bg-blue-600`, `text-slate-900` 같은 표준 값을 사용한다.
> Tailwind에 없는 정확한 값이 필요할 때만 `style={{ color: 'var(--rm-primary)' }}` 식으로 변수 사용.

### Radius

| 의미 | 변수 | 값 |
|------|------|-----|
| 카드(기본) | `--rm-radius-card` | `20px` (lg `24px`) |
| 카드(대형) | `--rm-radius-card-lg` | `24px` |
| 버튼 | `--rm-radius-button` | `14px` |
| 입력창 | `--rm-radius-input` | `12px` |
| pill | `--rm-radius-pill` | `9999px` |

### Shadow

| 의미 | 변수 |
|------|------|
| soft (기본 카드) | `--rm-shadow-soft` |
| md (호버) | `--rm-shadow-md` |
| elevated | `--rm-shadow-card-elevated` |

### 여백

| 의미 | 변수 | 값 |
|------|------|-----|
| 페이지 좌우(모바일) | `--rm-page-padding-x` | `16px` |
| 카드 내부(모바일) | `--rm-card-padding-mobile` | `20px` |
| 카드 내부(PC) | `--rm-card-padding-pc` | `24px` |
| 콘텐츠 max-width | `--rm-content-max-w` | `1280px` |

### 타이포

| 의미 | 변수 | 값 (모바일) |
|------|------|--------------|
| 페이지 제목 | `--rm-fs-page-title` | `26px` (PC `28~30px`) |
| 섹션 제목 | `--rm-fs-section-title` | `19px` (PC `24px`) |
| 본문 | `--rm-fs-body` | `14px` |
| 보조 설명 | `--rm-fs-sub` | `13px` |
| 캡션 | `--rm-fs-caption` | `12px` |
| KPI 숫자 | `--rm-fs-kpi` | `20px` (PC `24px`) |

> **긴 문장은 최대 2줄**까지 노출. 3줄 이상이면 `line-clamp-2` 또는 `truncate` 적용.

### z-index 스택

| 의미 | 변수 | 값 |
|------|------|-----|
| base | `--rm-z-base` | `0` |
| sticky header | `--rm-z-sticky-header` | `30` |
| 모바일 탭바 | `--rm-z-tabbar` | `30` |
| 드롭다운 | `--rm-z-dropdown` | `40` |
| modal backdrop | `--rm-z-modal-backdrop` | `50` |
| modal | `--rm-z-modal` | `60` |
| toast | `--rm-z-toast` | `70` |

### 모션

| 의미 | 변수 |
|------|------|
| easing | `--rm-easing` `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| duration fast | `--rm-duration-fast` `150ms` |
| duration md | `--rm-duration-md` `220ms` |
| duration slow | `--rm-duration-slow` `360ms` |

### 반응형 breakpoint

- 모바일: 0~767px (Tailwind 기본, prefix 없음)
- 태블릿: 768~1023px (`md:`)
- PC: 1024px 이상 (`lg:`)

PC 좌측 사이드바는 `lg:` 부터 노출, 모바일 상단바·하단 탭바는 `lg:hidden`.

---

## 2. 공통 컴포넌트

위치: [src/components/app/index.tsx](src/components/app/index.tsx)
사용: `import { PageHeader, SectionCard, MetricCard, PrimaryButton, IconBadge, ... } from '@/components/app';`

### 레이아웃

| 컴포넌트 | 별칭 | 용도 |
|----------|------|------|
| `PageHeader` | — | 페이지 상단 아이콘+제목+설명+우측 액션 |
| `SectionHeader` | — | 카드 안 섹션 제목 |
| `AppCard` | `SectionCard` | 기본 카드 (density, tone) |
| `AccentCard` | — | 좌측 4px 컬러 띠 카드 (카테고리 강조) |
| `AIInsightCard` | — | AI 영역 전용 다크 그라데이션 카드 |
| `EmptyState` | — | 빈 상태 + 액션 CTA |

### KPI / 액션

| 컴포넌트 | 용도 |
|----------|------|
| `MetricCard` | KPI 숫자 카드 (label + value/amount + Icon) |
| `ActionCard` | 빠른 작업 카드 (Link + Icon + label) |

### 텍스트 / 뱃지

| 컴포넌트 | 별칭 | 용도 |
|----------|------|------|
| `CurrencyText` | — | 금액 통일 표시 (size, tone) |
| `AppBadge` | `StatusChip` | 상태 칩 (info/success/warning/danger/neutral) |
| `DeltaChip` | — | 전기 대비 변동률 ▲/▼ 칩 |
| `IconBadge` | — | 톤별 연한 배경 + 단색 아이콘 |

### 버튼

| 컴포넌트 | 매핑 |
|----------|------|
| `Button` (재노출) | `variant=primary/secondary/ghost/danger`, `size=sm/md/lg` |
| `PrimaryButton` | Button + variant=primary 고정 |
| `SecondaryButton` | Button + variant=secondary 고정 |
| `GhostButton` | Button + variant=ghost 고정 |
| `DangerButton` | Button + variant=danger 고정 |

### Shell 요소 (단일 통합 진실)

| 컴포넌트 | 위치 |
|----------|------|
| `Sidebar` (PC) / `MobileTopBar` / `BottomNavigation` | [src/components/layout/AppShell.tsx](src/components/layout/AppShell.tsx) 안에 모두 통합 |

`AppShell`이 모바일/PC 분기를 책임지므로 외부에서 따로 import하지 않는다. 변경이 필요하면 `AppShell` 한 곳만 수정.

---

## 3. 카드 스타일 규칙

- radius: 모바일 `20px`, PC `24px` (`rounded-[20px] lg:rounded-[24px]`)
- 좌우 margin (모바일): `16px` (`px-4`)
- 내부 padding: 모바일 `20px` (`p-5`), PC `24px` (`p-5 lg:p-6`)
- border: `#E2E8F0` (`border-slate-200`)
- shadow: `var(--rm-shadow-soft)` (강하지 않게)
- 배경: 기본 `#FFFFFF`. AI 카드만 navy 그라데이션.

→ `AppCard` 또는 `SectionCard`를 그대로 사용하면 이 규칙이 자동 적용됨.

---

## 4. 아이콘 정책

- 컬러 이모지(✨ ⭐ 💡 🎯 등)는 **제거**. 단색 stroke 아이콘으로 통일.
- 아이콘 출처:
  - 메뉴/UI: [src/components/icons.tsx](src/components/icons.tsx) (`HomeIcon`, `SalesIcon`, `SparklesIcon`, `LightbulbIcon` 등 자체 SVG)
  - 페이지 헤더: `lucide-react` (`Users`, `Wallet`, `BarChart3` 등)
- 아이콘 배지: 반드시 `IconBadge` 사용 → 연한 배경 + 단색 아이콘
- AI 관련 아이콘만 gradient/glow 허용. 그 외는 단색.

---

## 5. 변경된 파일 (이번 디자인 시스템 정리)

| 파일 | 변경 |
|------|------|
| [src/app/globals.css](src/app/globals.css) | 토큰 보강: primarySoft, navyCard, surfaceSoft, purple, cyan / spacing·typography·z-index 변수 / duration 변수 |
| [src/components/app/index.tsx](src/components/app/index.tsx) | 신규: `IconBadge`, `ActionCard`, `AIInsightCard` / 별칭: `SectionCard`, `StatusChip`, `PrimaryButton`, `SecondaryButton`, `GhostButton`, `DangerButton` / `Button` 재노출 |

기존 컴포넌트(`AppCard`, `PageHeader`, `MetricCard`, `EmptyState`, `AccentCard`, `CurrencyText`, `AppBadge`, `DeltaChip`, `SectionHeader`)는 그대로 유지.

---

## 6. 아직 공통 컴포넌트로 바꾸지 못한 부분 (마이그레이션 대상)

> 이번 작업에서는 **신규 토큰·컴포넌트만 추가**했고, 기존 ad-hoc UI를 공통 컴포넌트로 교체하는 작업은 회귀 위험 때문에 별도 단계로 분리.

### 우선순위 높음

1. **대시보드 `QuickAction`** ([src/app/(app)/dashboard/page.tsx:476](src/app/(app)/dashboard/page.tsx#L476))
   - inline 정의됨. `ActionCard`로 교체 가능.
2. **대시보드 `KpiCard`** ([src/app/(app)/dashboard/page.tsx:397](src/app/(app)/dashboard/page.tsx#L397))
   - 자체 구현. spark·delta·emptyCta 등 기능이 있어 `MetricCard`보다 풍부 → `MetricCard`를 확장하거나 별도 `KpiCard`로 승격.
3. **대시보드 `AIInsightSection`** ([src/app/(app)/dashboard/AIInsightSection.tsx](src/app/(app)/dashboard/AIInsightSection.tsx))
   - 다크 그라데이션 카드. `AIInsightCard`와 톤 일치하므로 마이그레이션 가능. 단 stream 로직이 클라이언트 컴포넌트라 분리 필요.
4. **`StaffHubCards`** ([src/components/layout/StaffHubCards.tsx](src/components/layout/StaffHubCards.tsx))
   - 직원 영역 세그먼트 카드. `ActionCard` 변형으로 통합 가능.

### 우선순위 중간

5. **매출/비용/리포트 페이지의 inline 카드**들 (`rounded-xl border border-slate-200 bg-white` 직접 작성한 곳 약 30+) → `AppCard`로 점진 교체.
6. **빈 상태 박스** — `sales/expenses/contracts/notices` 각자 자체 빈 상태 UI 보유 → `EmptyState` + `EmptyIllustration` 일러스트 활용해 통일.
7. **`AddressSearch`, `MoneyInput`, `PhoneInput`** — 자체 스타일링 보유. 기본 `Input`과 시각적 일치 확인 필요.

### 우선순위 낮음

8. **SignaturePad, MonthPicker** — 입력 위젯류. 디자인 토큰 적용은 외관 변화 적음.

### 손대지 말 것

- **AppShell의 Sidebar/MobileTopBar/BottomNavigation**: 외부 컴포넌트로 추출하면 prop drilling이 늘어 오히려 응집도 떨어짐. 현재 한 곳 통합이 최선.

---

## 7. 마이그레이션 권장 순서

1. **신규 화면**: 무조건 `@/components/app`의 별칭 컴포넌트만 사용.
2. **기존 화면 수정 시**: 그 화면 안의 ad-hoc 카드 1~2개를 `SectionCard`로 교체. 작은 보폭으로 점진 변환.
3. **대규모 일괄 교체 금지**: 한 번에 여러 페이지를 건드리면 회귀 위험 큼. 페이지 1개씩.

---

## 8. 위반 사항 알림

다음 패턴이 보이면 디자인 시스템 위반:

- `bg-white rounded-2xl border ...` 를 새로 작성 → `<SectionCard>` 사용
- `<button className="bg-blue-600 ...">` 새로 작성 → `<PrimaryButton>` 사용
- 이모지 (✨ ⭐ 💡 🎯 🚀 🔥 등) 사용 → `lucide-react` 또는 `src/components/icons.tsx` 아이콘 사용
- 카드 안에 임의 padding (`p-3`, `p-7`) → `SectionCard density="compact|default"` 사용
- `text-[15px] font-bold` 같은 임의 폰트 사이즈 → 위 타이포 토큰 참조

리뷰 시 위 항목을 체크.
