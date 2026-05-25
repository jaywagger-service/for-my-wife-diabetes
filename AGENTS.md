---
id: AGENTS-001
type: agent-instructions
priority: P0
version: 1.2
load_when: always
size_tokens: ~1800
---

# AGENTS.md — AI 에이전트 행동 지침

> 이 파일은 Claude Code, Codex 등 모든 AI 에이전트가 **항상** 읽어야 하는 파일입니다.
> 200줄 이내 유지. 상세 내용은 docs/ 참조.

---

## ⚓ IDENTITY

- **앱 이름**: For my wife
- **부제**: 작게나마 도움이 되면 좋겠어
- **만든 사람**: Jaywagger (실명 어디에도 노출 X)
- **목적**: 임신성 당뇨 관리 PWA — 혈당 기록, 식사 기록, 산책 타이머, 인슐린 위험 알림

## ⚓ END_IDENTITY

---

## ⚓ ABSOLUTE_RULES

위반 시 즉시 중단하고 사람에게 보고.

### 프라이버시
1. **코드/주석/문서 어디에도 실명/특정인 이름 하드코딩 금지** (Codex grep 검증 대상)
2. **외부 API 호출 0건 유지** — fetch/axios 등 외부 엔드포인트 호출 추가 금지
3. placeholder는 `"예: 본인 이름 또는 호칭"` 형태만 허용
4. mock/예시 데이터에 가상 이름("지영" 등) 삽입 금지

### 디자인
5. **디자인 토큰만 사용** — `bg`, `card`, `ink`, `accent`, `warn`, `good`, `gold` 계열
6. 커스텀 HEX 색상 직접 삽입 금지 (tailwind.config.ts 토큰만)

### 임상 수치 (ADA 2025 기준, 변경 금지)
7. 공복: `< 95 mg/dL`
8. 식후 1h: `< 140 mg/dL`
9. 식후 2h: `< 120 mg/dL`
10. 인슐린 위험: 7일 창, fasting≥95 또는 pp1h≥140이 **50% 초과** 시

## ⚓ END_ABSOLUTE_RULES

---

## ⚓ ARCHITECTURE

```
app/                  Next.js 15 App Router (server + client)
  layout.tsx          루트 레이아웃, MigrationRunner 포함
  page.tsx            홈 (HomeClient 로드)
  glucose/page.tsx    혈당 입력
  meal/page.tsx       식사 기록 + 식후 1h 알림
  settings/page.tsx   설정 (이름, 목표 등)
components/
  HomeClient.tsx      홈 클라이언트 (useLiveQuery, visibilitychange)
  MigrationRunner.tsx v0→v1 마이그레이션 side-effect 컴포넌트
lib/
  db.ts               Dexie v4 스키마 (gdm_v2)
  notification.ts     Web Notification API + iOS 감지
  repository/         glucose/meal/exercise/settings CRUD
  migration/
    v0-to-v1.ts       gdm_v1(localStorage) → gdm_v2(Dexie) 1회 마이그레이션
  utils.ts            statusForReading, computeInsights, currentWeek
__tests__/            Vitest + fake-indexeddb + jsdom
public/               manifest.json, icon-192.svg, icon-512.svg
docs/                 DECISIONS.md, INDEX.md, V1.1-BACKLOG.md
reviews/              status.json, results/*.md (Codex 검증 산출물)
```

**데이터 키**: `gdm_v1` = v0 localStorage 원본 (읽기만), `gdm_v2` = v1 Dexie DB

## ⚓ END_ARCHITECTURE

---

## ⚓ WORKFLOW

### 표준 작업 흐름

1. `reviews/status.json` → `current_task` 확인
2. `docs/INDEX.md` → 필요한 docs만 선택적 로드
3. 구현 → 로컬 검증 (`npm run build`, `npm test`)
4. **git commit** (논리 단위로 분리)
5. **⚠️ git push 금지 — Codex PASS 전까지**
6. Codex 검증 요청 → PASS 수신 후 push
7. Jaywagger 최종 확인 → `status: completed`

### Push 금지 규칙 (ADR-010)
- Claude Code는 Codex 검증 PASS 없이 `main` 브랜치에 **절대 push 금지**
- 단, Jaywagger가 채팅에서 명시적으로 "push해줘" 지시 시 예외
- 위반 시: 다음 작업 시 반드시 먼저 보고

### git commit 규칙
- 논리 단위로 분리 (기능별/파일 그룹별)
- 메시지 형식: `type: 한글 설명` (type = feat/fix/docs/chore/test/refactor)
- 빈 commit 금지

## ⚓ END_WORKFLOW

---

## ⚓ BATCH_WORK_PRINCIPLE

### 역할 분리
| 역할 | 권한 |
|---|---|
| **Claude Code** | 코드·문서 수정, git commit/push, 구현 |
| **Codex** | 검증 전용 (4 Tier), result:pass 권한 보유 |
| **Jaywagger** | 최종 승인 (status:completed 닫기) |

Claude Code는 자기 작업에 `result: pass`를 박을 수 없음.

### 일괄 작업 시 금지 사항
- 중간에 단건 확인 요청 (사용자가 명시적으로 요청한 경우 제외)
- 미완성 상태로 커밋 (build/test 통과 후 커밋)
- Codex PASS 없이 push (Jaywagger 직접 지시 예외)
- 작업 도중 `reviews/status.json`의 `result: pass` 자체 기재

### 일괄 작업 시 권장 사항
- 독립적인 파일 편집은 병렬로 처리
- 각 커밋 전 `npm run build` (또는 lint) 확인
- 작업 완료 후 한 번에 요약 보고 (파일 목록 + 커밋 해시)
- `reviews/status.json` current_task 업데이트로 진행 상황 기록

### Claude Code 프롬프트 컨벤션
- 사용자가 "중간 확인 없이" 지시 시: 마지막에 한 번만 보고
- 사용자가 "먼저 X 하고 보고해" 지시 시: X 완료 후 중단 대기
- Codex 보고서 내용은 신뢰하되, 수정 대상 파일은 직접 확인 후 반영

### AI 보고서 검증
- Codex PASS 보고서에 기재된 파일 경로/함수명은 실제 존재 여부 확인 후 사용
- 보고서 내 "이미 수정됨" 표시가 있어도, git diff로 실제 변경 여부 확인

## ⚓ END_BATCH_WORK_PRINCIPLE

---

## ⚓ ENVIRONMENT

### 개발 환경
- **OS**: Windows 11 Home
- **Shell**: PowerShell 5.1 (기본) + Git Bash 병용 가능
- **Node**: 20.x LTS
- **패키지 매니저**: npm
- **IDE**: VS Code (Claude Code 확장)
- **배포**: Vercel (main push → 자동 배포)

### PowerShell UTF-8 설정 (ADR-011)
PowerShell에서 한글이 깨질 경우:
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
```
파일 저장은 항상 **UTF-8 without BOM** 사용.

### 명령어 참고
```powershell
npm run dev       # 개발 서버 (localhost:3000)
npm run build     # 프로덕션 빌드 (커밋 전 필수)
npm test          # Vitest 단위 테스트
npm run lint      # ESLint
```

### 경로 주의사항
- 프로젝트 루트: `C:\Users\JY Hwang\Desktop\AI Diabetes`
- PowerShell에서 공백 포함 경로는 따옴표 필수
- Git Bash 사용 시 경로는 `/c/Users/JY Hwang/Desktop/AI Diabetes`

## ⚓ END_ENVIRONMENT

---

## 🔄 이 파일 변경 시

변경 → `docs/DECISIONS.md`에 ADR 추가 → version 필드 업.
AI 자동 생성 금지 (ETH 연구: 3% 성공률 감소).
