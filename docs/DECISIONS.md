---
id: DOC-DECISIONS-001
type: decision-log
priority: P0
version: 1.0
load_when: 결정 이력 확인, 변경 시 추가
size_tokens: ~1500
---

# 의사결정 기록 (ADR — Architecture Decision Records)

> "왜 그렇게 했지?"를 잊지 않기 위한 기록. 새 결정마다 추가.

---

## ⚓ FORMAT

```markdown
## ADR-NNN: 결정 제목
- **일자**: YYYY-MM-DD
- **상태**: proposed / accepted / superseded
- **컨텍스트**: 왜 이 결정이 필요했나
- **선택**: 어떤 옵션을 골랐나
- **고려한 대안**: 다른 옵션과 트레이드오프
- **결과**: 어떻게 됐나 (사후 평가, 시간 지나서 추가)
```

---

## ⚓ DECISIONS

### ADR-001: 로컬 우선(Offline-First) 데이터 저장
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: 의료 데이터의 프라이버시 보호 + 인터넷 없이도 동작 필요
- **선택**: IndexedDB (Dexie) 로컬 저장. 클라우드 동기화는 v2에서 추가
- **대안**: Firebase/Supabase 즉시 통합 (탈락 - 외부 전송 위험)
- **결과**: pending

### ADR-002: Next.js + TypeScript 스택
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: v0 단일 HTML 한계. 확장성 필요.
- **선택**: Next.js 15 + React 19 + TypeScript + Tailwind v3
- **대안**: Vue/Nuxt (탈락 - Vercel 통합도/한국 자료 부족), SvelteKit (탈락 - 생태계)
- **결과**: 빌드 통과, Codex 검증 대기

### ADR-003: 만든 사람 표기 "Jaywagger"
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: 외부 공개 시 실명 노출 방지
- **선택**: "Jaywagger" 고정 표기, 실명 어디에도 노출 X
- **대안**: 본명 노출 (탈락), 익명 (탈락 - 만든 사람 메시지가 핵심)
- **결과**: 모든 코드/문서/메타데이터에 반영 필요

### ADR-004: 앱 사용자 이름은 외부 노출 금지
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: 의료 도구 프라이버시. 아내 이름이 어디에도 박히면 안 됨.
- **선택**: 
  - 사용자 입력 이름은 본인 화면에만 표시
  - placeholder는 "예: 본인 이름 또는 호칭"
  - 코드/주석/README에 특정 이름 하드코딩 금지
  - mock 데이터, 예시에도 가상 이름("지영" 등) 금지
- **대안**: 기본 이름 제공 (탈락 - 프라이버시 위험)
- **결과**: AGENTS.md에 절대 규칙으로 박힘

### ADR-005: 앱 이름 "For my wife"
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: 아내를 위한 도구라는 의도를 직설적으로
- **선택**: 영문 "For my wife", 한글 부제 "작게나마 도움이 되면 좋겠어"
- **대안**: "혈당기록" (탈락 - 일반적), "With my wife" (탈락 - 톤 약함)
- **결과**: 만든 사람 카피 확정:
```
  이 앱은 Jaywagger가 아내를 위해 만들었습니다.
  쌍태아 임신 28주차에 임신성 당뇨를 진단받은 아내가
  매일의 작은 기록을 부담 없이 남길 수 있도록 만들었습니다.
  이용하시는 모든 분들께 작게나마 도움이 되면 좋겠습니다.
```

### ADR-006: 다중 AI 검증 체계 (Claude Code + Codex)
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: 단일 AI 결과물 검증 부재. 의료 도구라 신뢰성 중요.
- **선택**: 
  - Claude Code = 구현자
  - Codex = 검증자 (4 Tier)
  - 사람(Jaywagger) = 최종 승인자
  - 신뢰 분리: Claude Code는 자기 작업 PASS 박을 권한 없음
- **대안**: Claude Code 단독 (탈락 - 자가 검증의 한계)
- **결과**: 1차 검증에서 P0 4건 발견 — 체계 효과 입증

### ADR-007: Hardness Engineering 적용 (AGENTS.md + Progressive Disclosure)
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: docs 늘어날수록 매번 전체 로드는 비효율 (5000토큰/세션). ETH 연구: AI 자동 생성 docs는 성공률 3% 감소.
- **선택**: 
  - AGENTS.md (200줄 이내, 항상 로드)
  - docs/INDEX.md (포인터)
  - 본문은 필요할 때만 로드
  - Skills 도입은 v1 배포 후 (Stage 2)
- **대안**: 전체 docs 한 번에 작성 후 매번 로드 (탈락 - 토큰 낭비)
- **결과**: 셋업 30분, 토큰 80% 절감 예상

### ADR-008: 임상 수치 출처 (ADA 2025)
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: 의료 가이드라인 수치는 출처 추적 가능해야
- **선택**: ADA Standards of Care 2025 기준
  - 공복: < 95 mg/dL
  - 식후 1h: < 140 mg/dL
  - 식후 2h: < 120 mg/dL
  - 인슐린 위험: 7일, fasting ≥95 또는 pp1h ≥140이 50% 이상
- **대안**: KDA 2025 (병행 검토, 향후 추가 가능)
- **결과**: AGENTS.md 절대 규칙으로 반영

### ADR-009: PWA SVG 아이콘 (v1) → PNG (v1.1)
- **일자**: 2026-05-25
- **상태**: accepted (임시)
- **컨텍스트**: iOS Safari는 PNG 아이콘 선호
- **선택**: v1은 SVG로 시작, v1.1에서 PNG 변환
- **결과**: v1.1 TODO

### ADR-010: AI 역할 분리 — Claude Code(구현) vs Codex(검증)
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: v1 1차 작업 시 Claude Code가 Codex 검증 전에 main 브랜치에 push하는 사례 발생. 재발 방지 필요.
- **선택**:
  - Claude Code = 구현자 (코드·문서 수정, git commit)
  - Codex = 검증자 전용 (4 Tier 검토, result:pass 권한 독점)
  - Jaywagger = 최종 승인자 (status:completed 권한)
  - Claude Code는 Codex PASS 없이 main push 금지 (Jaywagger 직접 지시 예외)
- **대안**: Claude Code가 self-verify 후 push (탈락 — 자가 검증의 한계, 1차 사례로 입증)
- **결과**: AGENTS.md WORKFLOW + BATCH_WORK_PRINCIPLE에 반영

### ADR-011: Windows PowerShell UTF-8 인코딩 표준
- **일자**: 2026-05-25
- **상태**: accepted
- **컨텍스트**: Windows 11 PowerShell 기본 인코딩(CP949)이 한글 파일 작성 시 BOM 또는 깨짐 유발. 소스 파일·커밋 메시지 일관성 필요.
- **선택**:
  - 모든 소스 파일: UTF-8 without BOM
  - PowerShell 세션 시작 시: `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`
  - VS Code: `"files.encoding": "utf8"` (기본값 유지)
- **대안**: BOM 포함 UTF-8 (탈락 — Node.js/ESLint 파서 오류 가능)
- **결과**: AGENTS.md ENVIRONMENT 섹션에 명시

---

## ⚓ PENDING

향후 결정 필요:

- [ ] v2 클라우드 동기화 시 인증 방식 (매직 링크 vs Google vs Passkey)
- [ ] CGM 데이터 가져오기 형식 (Libre/Dexcom CSV)
- [ ] 의료진 공유 링크 보안 모델
- [ ] 다국어 우선순위 (영어 → 일본어 → 중국어)
- [ ] 임상의 자문 도입 시기

새 결정 시 ADR-NNN으로 위에 추가.