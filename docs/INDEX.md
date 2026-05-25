---
type: index
purpose: docs 폴더 전체 지도
load_when: always (가벼움)
size_tokens: ~400
---

# docs/ 인덱스

이 폴더는 사람이 큐레이션한 명세를 담습니다.
AI 에이전트는 **필요한 문서만 선택적으로 로드**하세요.

---

## 📋 의사결정 / 워크플로

| 파일 | 토큰 | 언제 로드 |
|---|---|---|
| `DECISIONS.md` | ~1800 | 결정 이력 확인 시 |
| `08-handoff.md` | ~800 | 작업 인계/검증 시 |

## 🏥 임상 / 정책

| 파일 | 토큰 | 언제 로드 |
|---|---|---|
| `01-clinical-research.md` | ~3000 | 의료 로직 작업 시 (Stage 2) |
| `06-privacy.md` | ~600 | 데이터 처리 작업 시 |

## 🏗 아키텍처

| 파일 | 토큰 | 언제 로드 |
|---|---|---|
| `02-architecture.md` | ~1200 | 구조 변경 시 (Stage 2) |
| `05-roadmap.md` | ~500 | 우선순위 판단 시 |

## 🎨 디자인

| 파일 | 토큰 | 언제 로드 |
|---|---|---|
| `03-design-system.md` | ~1500 | UI 작업 시 (Stage 2) |

AGENTS.md에 디자인 토큰 핵심은 박혀있음. 상세는 위 파일.

## 📱 화면 명세

| 파일 | 토큰 | 언제 로드 |
|---|---|---|
| `04-screens/INDEX.md` | ~300 | 화면 작업 시작 시 |
| `04-screens/welcome.md` | ~600 | 환영 화면 작업 시 |
| `04-screens/home.md` | ~800 | 홈 화면 작업 시 |
| `04-screens/glucose.md` | ~900 | 혈당 입력 작업 시 |
| `04-screens/meal.md` | ~800 | 식사 기록 작업 시 |
| `04-screens/timer.md` | ~600 | 산책 타이머 작업 시 |
| `04-screens/trend.md` | ~700 | 추세 차트 작업 시 |
| `04-screens/report.md` | ~800 | 리포트 작업 시 |
| `04-screens/settings.md` | ~600 | 설정 작업 시 |

화면 명세는 Stage 2에서 점진적으로 작성.

---

## 🚧 작성 상태

- ✅ INDEX.md (이 파일)
- ✅ DECISIONS.md
- 🟡 08-handoff.md (Stage 1 작성 중)
- ⬜ 01–06, 04-screens/* (Stage 2에서 점진)

---

## 📐 작성 원칙

1. **frontmatter 필수** — id, type, priority, version, size_tokens
2. **섹션 마커 사용** — `## ⚓ SECTION_NAME` ... `## ⚓ END_SECTION`
3. **AI 친화적** — 짧은 문장, 명확한 규칙, 예시 1개씩
4. **사람이 큐레이션** — AI 자동 생성 금지 (ETH 연구: 3% 성공률 감소)

---

## 🔄 변경 시

문서 추가/변경 → 이 INDEX.md 업데이트 + `docs/DECISIONS.md`에 기록.