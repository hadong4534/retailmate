# 리테일메이트 UI 점검 보고서

- 점검일: 2026-05-11
- 범위: PC 12장 + 모바일 13장 (랜딩 ~ AI 챗봇)
- 캡처본 위치: [pc/](pc/), [mobile/](mobile/)
- 원본(리사이즈 전): [_original/](_original/)

---

## 캡처 인덱스

### PC (1440px 기준)
| # | 화면 | 파일 |
|---|------|------|
| 01 | 랜딩 | [pc/01-landing.png](pc/01-landing.png) |
| 02 | 로그인 | [pc/02-login.png](pc/02-login.png) |
| 03 | 홈 (대시보드) | [pc/03-home.png](pc/03-home.png) |
| 04 | 매출 | [pc/04-sales.png](pc/04-sales.png) |
| 05 | 비용 | [pc/05-expense.png](pc/05-expense.png) |
| 06 | 직원 관리 | [pc/06-employees.png](pc/06-employees.png) |
| 07 | 근태 현황 | [pc/07-attendance.png](pc/07-attendance.png) |
| 08 | 계약서 | [pc/08-contracts.png](pc/08-contracts.png) |
| 09 | 공지 | [pc/09-notices.png](pc/09-notices.png) |
| 10 | 월간 리포트 | [pc/10-reports.png](pc/10-reports.png) |
| 11 | 설정 | [pc/11-settings.png](pc/11-settings.png) |
| 12 | AI 챗봇 | [pc/12-ai-chat.png](pc/12-ai-chat.png) |

### 모바일 (390px 기준)
| # | 화면 | 파일 |
|---|------|------|
| 01 | 랜딩 | [mobile/01-landing.png](mobile/01-landing.png) |
| 02 | 로그인 | [mobile/02-login.png](mobile/02-login.png) |
| 03 | 홈 (상) | [mobile/03-home-top.png](mobile/03-home-top.png) |
| 04 | 홈 (중) | [mobile/04-home-middle.png](mobile/04-home-middle.png) |
| 05 | 홈 (하) | [mobile/05-home-bottom.png](mobile/05-home-bottom.png) |
| 06 | 매출 | [mobile/06-sales.png](mobile/06-sales.png) |
| 07 | 비용 | [mobile/07-expense.png](mobile/07-expense.png) |
| 08 | 직원 관리 | [mobile/08-employees.png](mobile/08-employees.png) |
| 09 | 근태 현황 | [mobile/09-attendance.png](mobile/09-attendance.png) |
| 10 | 계약서 | [mobile/10-contracts.png](mobile/10-contracts.png) |
| 11 | 월간 리포트 | [mobile/11-reports.png](mobile/11-reports.png) |
| 12 | 설정 | [mobile/12-settings.png](mobile/12-settings.png) |
| 13 | AI 챗봇 | [mobile/13-ai-chat.png](mobile/13-ai-chat.png) |

---

## P0 — 즉시 수정 (기능 차질)

### #1. 모바일 AI 챗봇 입력창 가려짐
- 캡처: [mobile/13-ai-chat.png](mobile/13-ai-chat.png)
- 증상: 추천 질문 칩까지만 보이고 `+ 궁금한 점을 자연어로 물어보세요` 입력란이 안 보임. PC([pc/12-ai-chat.png](pc/12-ai-chat.png))에는 정상.
- 원인 추정: 하단 floating 탭바와 z-index 충돌 또는 입력 영역이 탭바 아래로 밀림.
- 영향: **모바일에서 챗봇 사용 자체 불가.**
- 해결 방향: 입력창 `bottom`을 `tabbar 높이 + safe-area-inset-bottom` 만큼 띄우거나, AI 챗 페이지에서 탭바 숨김.

### #2. 모바일에서 AI 도구·공지·설정 진입점 부재
- 캡처: 모바일 전 화면 하단 탭바 (홈/매출/비용/직원/리포트 5개)
- 증상: PC 사이드바엔 10개 메뉴지만 모바일 탭바엔 5개. 헤더 프로필 ▼ 안에 숨겼는지 확인 필요.
- 영향: 메모리에 적힌 **"모바일 동등 적용 원칙"** 위반.
- 해결 방향: 프로필 드로어 또는 "더보기" 탭으로 노출.

### #3. 모바일 "급여 계산" 메뉴가 PC에는 없음
- 캡처: [mobile/08-employees.png](mobile/08-employees.png) 상단 세그먼트
- 증상: 모바일엔 "급여 계산 / 월별 명세" 진입점이 있으나 PC 사이드바엔 대응 메뉴 없음.
- 해결 방향: PC 사이드바 `직원 관리` 그룹에 추가하거나, 모바일 세그먼트에서 제거(미구현이라면).

---

## P1 — UX 결함

### #4. "(이름 없음)" 직원 표시
- 캡처: [pc/06-employees.png](pc/06-employees.png), [pc/07-attendance.png](pc/07-attendance.png), [mobile/08-employees.png](mobile/08-employees.png)
- 이름이 빈 레코드가 그대로 노출. 이름 필수 검증 또는 임시 라벨("신규 직원 #1") 표시.

### #5. 매출/리포트 차트의 미래 날짜 0원 plot
- 캡처: [pc/04-sales.png](pc/04-sales.png), [pc/10-reports.png](pc/10-reports.png)
- 5/11 이후 모든 날짜가 0원으로 plot되어 그래프가 급강하. 데이터 없음과 실 0원이 구분 안 됨.
- 해결: 미래 날짜는 plot 제외 또는 회색 점선 처리, hover 시 "미도래" 안내.

### #6. "평균 근무시간 2분" 표본 부족 노출
- 캡처: [pc/07-attendance.png](pc/07-attendance.png)
- 1건짜리 출퇴근으로 산출된 평균이 그대로 표시. 표본 ≤ N일 때 "-" 또는 "데이터 부족".

### #7. 모바일 매출 테이블 컬럼 잘림
- 캡처: [mobile/06-sales.png](mobile/06-sales.png) 하단 "일별 매출 내역"
- 카드/현금 컬럼이 화면 밖. 가로 스크롤 가능 여부와 우측 페이드 그라데이션 힌트 필요.

### #8. 모바일 리포트 채널별 매출 금액 줄바꿈
- 캡처: [mobile/11-reports.png](mobile/11-reports.png) "채널별 매출" 영역
- `101,223,800원`이 2줄로 깨짐. 카드 폭 또는 폰트 사이즈 조정 / 자리수 단위 축약(`1.01억`).

### #9. 손익계산 영역 비용 행 누락
- 캡처: [pc/10-reports.png](pc/10-reports.png), [mobile/11-reports.png](mobile/11-reports.png)
- "매출 → 영업이익"만 표시되고 "비용" 행이 사라짐(비용 0원이라 생략된 듯). 0원이라도 항상 노출해 손익 흐름 보존.

### #10. 계약서 "발송 취소" 액션이 모바일에서 누락
- 캡처: [pc/08-contracts.png](pc/08-contracts.png) vs [mobile/10-contracts.png](mobile/10-contracts.png)
- PC 테이블엔 `발송 취소` 버튼 있음, 모바일 카드엔 `보기 / 서명 링크 복사`만. 카드 더보기 메뉴(⋯)로 노출 권장.

---

## P2 — 폴리시·일관성

### #11. AI 모델명 노출
- 캡처: [pc/03-home.png](pc/03-home.png) AI 인사이트, [pc/12-ai-chat.png](pc/12-ai-chat.png), [mobile/13-ai-chat.png](mobile/13-ai-chat.png)
- `Claude Sonnet 4.6`, `AI · Beta` 표기. 의도 없는 노출이면 `AI` 또는 `리테일메이트 AI`로 일원화.

### #12. 사업자등록번호 자릿수
- 캡처: [pc/11-settings.png](pc/11-settings.png), [mobile/12-settings.png](mobile/12-settings.png)
- `768-0703548` (8자리). 한국 사업자번호는 `XXX-XX-XXXXX` 10자리. 입력 마스크/검증 필요.

### #13. 설정 "월 매출 목표" 단위 표시 겹침
- 캡처: [mobile/12-settings.png](mobile/12-settings.png)
- `150,000,000` 끝의 단위 글자가 인풋 우측에 겹쳐 잘림. padding-right 확보 또는 suffix 분리.

### ~~#14. 모바일 랜딩 카피 의심 표기~~ (취소 — false positive)
- 캡처: [mobile/01-landing.png](mobile/01-landing.png) 하단
- ~~"자영업자를 위한 출신을 플랫폼" — 오타 가능성~~
- **2026-05-11 정정**: 실제 코드와 운영 모두 **"자영업자를 위한 올인원 플랫폼"**. 모바일 캡처 글자가 작아 "올인원"을 "출신을"로 오독한 것. 오타 아님. [page.tsx:227](src/app/page.tsx#L227) 및 retailmate.io에서 직접 확인.

### #15. 홈 KPI 빈 데이터 표현 약함
- 캡처: [pc/03-home.png](pc/03-home.png), [mobile/04-home-middle.png](mobile/04-home-middle.png)
- 4종 KPI 전부 0원/0명일 때 "어제 대비"만 표시. 입력 유도 CTA(`+ 매출 입력`) 인라인 노출 권장.

### #16. AI 챗봇 추천 질문 정적
- 캡처: [pc/12-ai-chat.png](pc/12-ai-chat.png)
- 컨텍스트와 무관한 5개 고정. 매출/근태/계약 페이지별 동적 추천이면 활용도 향상.

---

## P3 — 향후 개선

- 결제수단별 카드 클릭 시 해당 채널 필터링.
- AI 챗봇 FAB(플로팅 버튼)을 모든 페이지 노출 → 도달성 향상.
- 근태 캘린더 `today` 마커가 selected와 톤이 비슷 — 톤 다운.
- 공지·비용 빈 상태에 "예시 보기" 토글이 있으면 학습 곡선 낮춤.
- 매출 데이터 hover tooltip — 모바일은 tap 시 표시되도록.

---

## parity 매트릭스 요약

| 화면 | PC | 모바일 | 비고 |
|------|----|----|------|
| 메뉴 진입점 | 사이드바 10개 | 탭바 5개 | AI·공지·설정 진입로 불명 (#2) |
| 직원 관리 그룹 | 직원관리/근태/계약서 3분리 | 직원 탭 + 세그먼트 4(급여 추가) | #3 |
| 계약서 액션 | 보기/서명링크/발송취소 | 보기/서명링크 | 발송취소 누락 (#10) |
| 손익계산 | 매출→영업이익만 | 동일 | 비용 행 누락 (#9) |
| 차트 미래 날짜 | 0원 plot | 0원 plot | #5 (양 플랫폼 동일 결함) |
| 모델명 노출 | Claude Sonnet 4.6 | 동일 | #11 |

---

## 권장 처리 순서

1. **P0 전부**(#1~#3) — 모바일 기본 도달성 회복
2. **#9 손익계산 비용 행** — 리포트 신뢰도
3. **#5 미래 날짜 plot** — 데이터 오해 방지
4. **#7, #8, #13** — 모바일 레이아웃 깨짐 일괄 정리
5. **#4, #6, #12, #14** — 데이터 정합성/카피 정리
6. **#11, #15, #16** 외 P2/P3 — 후속 폴리시
