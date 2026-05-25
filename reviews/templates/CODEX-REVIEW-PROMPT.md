# 작업: For my wife v1 — 2차 검증

너는 이 프로젝트의 **검증자(Reviewer)** 역할이야. 구현자(Claude Code)가 만든 코드를 명세 대비 검증하고 PASS/FAIL 판정해.

## 컨텍스트 (먼저 읽어)

다음 순서로 읽기:
1. `AGENTS.md` — 절대 규칙, 디자인 토큰, 임상 수치
2. `reviews/README.md` — 검증 워크플로, 4 Tier 체크리스트
3. `reviews/status.json` — 현재 task 정보
4. `reviews/results/20260525-1600-codex-v1-initial.md` — 1차 검증 리포트 (참고)
5. `docs/INDEX.md` → 필요한 docs만 선택적 로드

이 프로젝트는:
- **임신성 당뇨 관리 앱** (의료 도구, 신뢰성 핵심)
- **Next.js 15 + Dexie(IndexedDB) + Tailwind v3 + Vercel**
- **로컬 우선, 오프라인 동작**
- **만든 사람: Jaywagger**, 사용자: Jaywagger의 아내
- 자세한 건 AGENTS.md 참조

## 검증 대상

이번 task: **T-2026-05-25-002 (Codex P0 4건 수정)**

수정 대상이었던 항목:
1. **P0-1**: v0 → v1 데이터 마이그레이션 (localStorage `gdm_v1` → Dexie `gdm_v2`)
2. **P0-2**: 식사 저장 후 1시간 후 알림 옵션
3. **P1-1**: HomeClient 날짜 stale 문제
4. **P1-2**: 핵심 함수 단위 테스트 (statusForReading, currentWeek, migration)

이 4건이 모두 수정됐는지, 그리고 새로 도입한 코드가 다른 문제를 만들지 않았는지 확인.

## 검증 4 Tier — 모두 수행

### Tier 1 — 자동 검증 (Mechanical)

다음 명령어 실행 후 결과 확인:

```bash
npm install            # 의존성 OK?
npm run build          # 빌드 성공?
npx tsc --noEmit       # 타입 에러 0?
npm test               # vitest 모든 케이스 PASS?
```

**판정**: 4개 모두 PASS여야 통과. 하나라도 FAIL이면 즉시 FAIL-BLOCKER.

### Tier 2 — 명세 일치성 (Spec Compliance)

#### 2-A. P0-1 마이그레이션 검증

- [ ] `lib/migration/v0-to-v1.ts` (또는 유사 위치) 파일 존재
- [ ] `localStorage.getItem("gdm_v1")` 읽는 코드 존재
- [ ] settings, glucose, meals, exercise 4개 테이블로 이전
- [ ] 중복 이전 방지 플래그 (settings.migratedFromV0 또는 유사)
- [ ] 기존 데이터 있으면 /welcome 리다이렉트 안 함
- [ ] 앱 첫 진입점에서 1회 호출 (layout.tsx 또는 첫 페이지)

**검증 방법**:
```bash
# 파일 존재 확인
ls lib/migration/
# 키워드 grep
grep -r "gdm_v1" lib/ app/
grep -r "migratedFromV0\|migration.*flag" lib/
```

#### 2-B. P0-2 알림 검증

- [ ] `app/meal/page.tsx`에 토글 UI 추가
- [ ] `Notification.permission` 처리 로직
- [ ] 권한 거부/미지원 시 UI 안내 (코드 주석 X, 실제 UI)
- [ ] 저장 시 토글 ON이면 1시간 후 알림 예약
- [ ] iOS Safari PWA 제약 안내

**검증 방법**:
```bash
grep -n "Notification.permission\|requestPermission" app/meal/page.tsx
grep -n "setTimeout.*3600\|1\.0.*60.*60" app/meal/page.tsx
```

#### 2-C. P1-1 stale 검증

- [ ] `components/HomeClient.tsx`에 날짜 재계산 로직
- [ ] visibilitychange 이벤트 OR setInterval (1분 권장)
- [ ] cutoff7, todayStart가 useState/useMemo로 감싸짐
- [ ] useLiveQuery deps에 날짜 의존성 반영

**검증 방법**:
```bash
grep -n "visibilitychange\|setInterval" components/HomeClient.tsx
grep -n "useMemo\|useState.*today\|useState.*cutoff" components/HomeClient.tsx
```

#### 2-D. P1-2 테스트 검증

- [ ] `__tests__/` 또는 `*.test.ts` 존재
- [ ] statusForReading 테스트 케이스 (정상/초과/경계값)
- [ ] currentWeek 테스트 케이스
- [ ] migration 테스트 케이스 (빈 localStorage / 데이터 있음 / 중복 호출)
- [ ] `npm test` 모두 PASS

### Tier 3 — 임상 정합성 (Clinical Compliance)

AGENTS.md의 ABSOLUTE_RULES 임상 수치와 코드 일치 확인:

```bash
# 공복 95
grep -rn "95" lib/ app/ components/ | grep -i "fast\|fasting\|target"

# 식후 1h 140
grep -rn "140" lib/ app/ components/ | grep -i "pp1h\|postprandial\|target"

# 식후 2h 120
grep -rn "120" lib/ app/ components/ | grep -i "pp2h\|target"

# 50% 룰 (인슐린 위험)
grep -rn "0\.5\|50.*percent\|50%\|insulinRisk" lib/
```

체크리스트:
- [ ] 공복 목표값 기본 95 mg/dL (사용자 변경 가능)
- [ ] 식후 1h 목표값 기본 140 mg/dL
- [ ] 식후 2h 목표값 기본 120 mg/dL
- [ ] 인슐린 위험 7일 50% 룰 정확
- [ ] 사용자에게 "약물 시작하세요" 같은 직접 처방 텍스트 없음
- [ ] 의료 권고 시 "산부인과 진료를 통해" 또는 유사 면책 문구 있음

검증 방법:
```bash
# 직접 처방 텍스트 검색 (있으면 안 됨)
grep -rin "약을 드세요\|약 복용\|prescribe\|medication.*start" app/ components/

# 면책 문구 (리포트 화면 등에 있어야)
grep -rn "산부인과\|의사\|진료" app/ components/
```

### Tier 4 — 프라이버시 (Privacy)

#### 4-A. 외부 데이터 전송 0건

```bash
# fetch/axios 외부 호출
grep -rn "fetch(\|axios\." lib/ app/ components/ | grep -v "test\|spec"

# 발견되는 fetch는 자체 자원(/icon-192.svg 등) 또는 Notification API 등 OK
# 외부 도메인 호출 발견 시 FAIL-BLOCKER
```

#### 4-B. 콘솔 로그에 의료 데이터 0건

```bash
grep -rn "console\." lib/ app/ components/ | grep -v "test\|spec"

# console.log/warn/error 발견 시:
#   - 의료 데이터 (glucose value, meal data 등) 출력 = FAIL-BLOCKER
#   - 일반 디버그 메시지 = WARN
#   - 에러 로깅 = OK (단, 의료 데이터 포함 X)
```

#### 4-C. 실명 하드코딩 0건

```bash
# 이전에 예시로 등장했던 이름들 (검증용)
grep -rn "지영\|진영\|황진영" lib/ app/ components/ public/ docs/

# 만든 사람은 Jaywagger만 허용
grep -rn "Jaywagger" lib/ app/ components/ public/

# placeholder가 일반적인지
grep -rn "placeholder.*=.*\"" app/welcome/ app/settings/
```

체크리스트:
- [ ] 코드에 가상 이름(지영 등) 없음
- [ ] 만든 사람 표기는 "Jaywagger"만
- [ ] placeholder는 "예: 본인 이름 또는 호칭" 같이 일반화
- [ ] mock 데이터에 가상 이름 없음

#### 4-D. 분석 도구 0건

```bash
grep -rn "gtag\|google-analytics\|GA_\|mixpanel\|amplitude\|posthog\|sentry" lib/ app/ components/ public/
# 모두 0건이어야 함
```

#### 4-E. PWA 매니페스트 검증

```bash
cat public/manifest.json
```

- [ ] name: "For my wife"
- [ ] description에 한글 부제 포함
- [ ] 외부 URL 참조 0건

## 추가 검증 (1차 검증 보강)

### 5-A. 데이터 모델 안정성

- [ ] `lib/db.ts`의 Dexie 버전 변경 시 마이그레이션 함수 포함
- [ ] `ts` 필드에 인덱스 설정 (성능 - WARN으로 분류)
- [ ] settings 테이블 단일 row 패턴 일관

### 5-B. 에이전트 작업 품질 신호

git log에서 최근 작업 검증:
```bash
git log --oneline -20
```

- [ ] 커밋 메시지 명확 (feat:, fix:, docs: 등 prefix)
- [ ] 한 커밋에 너무 많은 변경 X
- [ ] `rm` 명령 같은 위험 반복 흔적 없음

### 5-C. AGENTS.md / docs 일관성

- [ ] AGENTS.md의 BUILD_COMMANDS가 실제 package.json scripts와 일치
- [ ] AGENTS.md DESIGN_TOKENS 값이 tailwind.config.ts와 일치
- [ ] docs/DECISIONS.md의 임상 수치가 코드와 일치

## 출력 형식

다음 형식으로 리포트 작성. 위치: `reviews/results/{YYYYMMDD-HHMM}-codex-v1-002.md`

```markdown
---
task_id: T-2026-05-25-002
review_round: 2
reviewer: codex
reviewed_at: YYYY-MM-DD HH:MM
result: PASS | FAIL
---

# 2차 Codex 검증 리포트

## 종합 판정: PASS / FAIL

(한 줄 요약)

## Tier별 결과

| Tier | 결과 | 비고 |
|---|---|---|
| Tier 1 (자동) | ✅/❌ | build/typecheck/test 통과 여부 |
| Tier 2 (명세) | ✅/❌ | P0-1/P0-2/P1-1/P1-2 모두 충족 여부 |
| Tier 3 (임상) | ✅/❌ | ADA 2025 수치 정확성 |
| Tier 4 (프라이버시) | ✅/❌ | 외부 API/실명/콘솔 로그 |

## 발견 이슈

### [FAIL-BLOCKER] (있으면)

이슈 1: 제목
- 위치: 파일:라인
- 문제: ...
- 권장 수정: ...

### [FAIL-MAJOR] (있으면)

### [FAIL-MINOR] (있으면)

### [WARN] (개선 권장, 필수 아님)

## 1차 대비 개선 사항

- 이런 점이 좋아졌다 (구체적으로)

## 권장 다음 액션

PASS:
1. 휴대폰 PWA 테스트 → status: completed
2. git push origin main → Vercel 자동 배포

FAIL:
1. 위 이슈 수정 (우선순위 BLOCKER → MAJOR → MINOR)
2. 3차 검증 의뢰
```

## status.json 업데이트

리포트 작성 후 `reviews/status.json` 업데이트:

```json
{
  "current_task": {
    "status": "passed" 또는 "failed"
  },
  "last_review": {
    "by": "codex",
    "at": "YYYY-MM-DDTHH:MM:SSZ",
    "result": "pass" 또는 "fail",
    "report": "reviews/results/YYYYMMDD-HHMM-codex-v1-002.md",
    "summary": "한 줄 요약"
  }
}
```

⚠️ Claude Code는 자기 작업을 result:pass로 박을 권한 없음. 너(Codex)만 가능. 단, 사람(Jaywagger)이 최종 status:completed로 닫음.

## 시작

지금 시작해. 먼저 AGENTS.md와 reviews/README.md부터 읽고, 그다음 검증 들어가.

검증 중 헷갈리는 부분 있으면 명확히 명시하고 잠정 판정 + "추가 확인 필요" 표시해줘.
