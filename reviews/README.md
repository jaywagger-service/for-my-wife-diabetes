---
id: REVIEWS-README
type: workflow
priority: P0
version: 1.0
size_tokens: ~1200
---

# .reviews/ — AI 검증 워크플로

이 폴더는 Claude Code(구현)와 Codex(검증) 사이의 통신 채널입니다.

---

## ⚓ STRUCTURE

```
.reviews/
├── README.md              ← 이 파일 (운영 매뉴얼)
├── status.json            ← 현재 상태 (단일 진실 원천)
├── results/               ← Codex 검증 리포트
│   ├── YYYYMMDD-HHMM-codex-{task-id}.md
│   └── ...
└── handoff.log            ← (선택) 인계 이력
```

---

## ⚓ STATE_MACHINE

```
pending → in_progress → review_pending → review_in_progress → 
  ├─ passed → completed
  └─ failed → in_progress (재시도)
```

| 상태 | 의미 | 누가 set |
|---|---|---|
| `pending` | 작업 대기 | 사람(Jaywagger) |
| `in_progress` | 작업 중 | Claude Code |
| `review_pending` | 검증 대기 | Claude Code |
| `review_in_progress` | 검증 중 | Codex |
| `passed` / `failed` | 검증 결과 | **Codex만** |
| `completed` | 최종 종료 | **사람만** |

---

## ⚓ WORKFLOW

### 1. 작업 시작 (Claude Code)

```bash
# 1) status.json 읽기
cat .reviews/status.json

# 2) current_task.status를 in_progress로 변경
# 3) started_at에 현재 시각
# 4) owner를 claude-code로
# 5) 작업 진행
```

### 2. 작업 완료 (Claude Code)

```bash
# 1) git add + commit (단위별 분리 권장)
# 2) status.json:
#    - status: review_pending
#    - output_files 업데이트
# 3) 보고 메시지 출력
# ⚠️ result를 pass로 박지 마. Codex만 가능.
```

### 3. 검증 시작 (Codex)

```bash
# 1) status.json 읽기
# 2) status: review_in_progress
# 3) 다음 항목 검증 (4 Tier):
#    - Tier 1: npm run build, typecheck, lint
#    - Tier 2: 코드 vs docs/04-screens/* 명세 일치
#    - Tier 3: 임상 수치 (AGENTS.md ABSOLUTE_RULES 참조)
#    - Tier 4: 프라이버시 (외부 API, 실명 grep)
```

### 4. 검증 결과 작성 (Codex)

리포트 위치: `.reviews/results/YYYYMMDD-HHMM-codex-{task-id}.md`

리포트 형식:
```markdown
# Codex 검증 리포트

- 작업 ID: T-YYYYMMDD-NNN
- 검증 일시: YYYY-MM-DD HH:MM
- 판정: PASS / FAIL

## Tier별 결과
- Tier 1 (자동): ✅/❌
- Tier 2 (명세): ✅/❌
- Tier 3 (임상): ✅/❌
- Tier 4 (프라이버시): ✅/❌

## 발견 이슈 (FAIL인 경우)

### [FAIL-BLOCKER] 이슈 제목
- 위치: 파일명:라인
- 문제: ...
- 권장 수정: ...

### [FAIL-MAJOR] ...
### [FAIL-MINOR] ...
### [WARN] ...

## 권장 다음 액션
1. ...
2. ...
```

status.json 업데이트:
- `current_task.status`: `passed` 또는 `failed`
- `last_review.result`: 동일
- `last_review.report`: 리포트 경로

### 5. 최종 종료 (사람)

대표님(Jaywagger)이 직접:
- 휴대폰 실사용 테스트
- 결과 OK면 status.json:
  - `current_task.status`: `completed`
  - history에 추가
- 다음 task 셋업

---

## ⚓ CHECKLIST_TIER_2 (명세 일치)

Codex가 Tier 2 검증 시 체크할 항목:

- [ ] AGENTS.md의 DESIGN_TOKENS만 사용했는가
- [ ] 카피가 docs/04-screens/*의 명세와 100% 일치
- [ ] AC 리스트(있는 경우) 모두 충족
- [ ] TypeScript strict mode 위반 0건

## ⚓ CHECKLIST_TIER_3 (임상 정합성)

- [ ] 공복 목표 95 mg/dL 박혀있는가
- [ ] 식후 1h 목표 140 mg/dL
- [ ] 식후 2h 목표 120 mg/dL
- [ ] 인슐린 위험 임계값 50% 룰
- [ ] 사용자에게 약물 직접 추천하는 텍스트 0건
- [ ] "산부인과 진료를 통해" 문구 (의료 권고 시)

## ⚓ CHECKLIST_TIER_4 (프라이버시)

- [ ] `grep -r "fetch.*http" src/` → 외부 API 호출 0건
- [ ] `grep -ri "console.log" src/` → 의료 데이터 출력 0건
- [ ] 실명 grep (특정 이름들) → 0건
- [ ] `grep -r "analytics\|gtag\|GA_" src/` → 분석 도구 0건
- [ ] PWA manifest의 author == "Jaywagger"
- [ ] mock 데이터에 가상 이름 없음

---

## ⚓ FAIL_CLASSIFICATION

| 분류 | 의미 | 처리 |
|---|---|---|
| FAIL-BLOCKER | Tier 1, 3, 4 위반 | 즉시 수정, 머지 차단 |
| FAIL-MAJOR | Tier 2 카피/컬러 | 수정 필수 |
| FAIL-MINOR | Tier 2 구조 미세 | 다음 사이클 가능 |
| WARN | 개선 권장 | 선택적 |

---

## ⚓ EXAMPLE_FLOW

1차 (이미 완료):
```
T-2026-05-25-001: v0 → v1 마이그레이션
  → Claude Code: status: review_pending
  → Codex: status: failed, FAIL-BLOCKER 2건 + FAIL-MAJOR 2건
  → Jaywagger: 새 task T-002 생성
```

2차 (현재 진행):
```
T-2026-05-25-002: Codex P0 4건 수정
  → Claude Code: 작업 시작 → status: in_progress
  → 작업 완료 → status: review_pending
  → Codex: 재검증
  → PASS → Jaywagger: 휴대폰 테스트 → status: completed
  → 다음: Vercel 배포
```