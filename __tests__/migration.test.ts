import { describe, it, expect, beforeEach } from "vitest";
import { db, getSettings } from "@/lib/db";
import { migrateV0ToV1 } from "@/lib/migration/v0-to-v1";
import { addGlucose, getGlucoseInRange, getTodayGlucose } from "@/lib/repository/glucose";
import { addMeal, getRecentMeals } from "@/lib/repository/meals";
import { addExercise, getExerciseInRange } from "@/lib/repository/exercise";
import { statusForReading, currentWeek, computeInsights, dayKey } from "@/lib/utils";
import { notificationStatusLabel } from "@/lib/notification";
import type { Settings } from "@/lib/db";

// ============================================================
// Helpers
// ============================================================

async function clearDb() {
  await db.glucose.clear();
  await db.meals.clear();
  await db.exercise.clear();
  await db.settings.clear();
}

function setV0LocalStorage(data: object) {
  localStorage.setItem("gdm_v1", JSON.stringify(data));
}

const V0_SAMPLE = {
  setupDone: true,
  profile: { name: "테스터", weekAtSetup: 28, setupDate: "2025-05-01T00:00:00.000Z" },
  targets: { fasting: 95, pp1h: 140, pp2h: 120 },
  glucose: [
    { id: "g1", ts: "2025-05-01T07:00:00.000Z", value: 88, context: "fasting" },
    { id: "g2", ts: "2025-05-01T10:00:00.000Z", value: 130, context: "pp1h_breakfast" },
  ],
  meals: [
    {
      id: "m1",
      ts: "2025-05-01T08:30:00.000Z",
      photo: null,
      mealTime: "breakfast",
      orderOk: true,
      note: "잡곡밥",
    },
  ],
  exercise: [
    { id: "e1", ts: "2025-05-01T09:00:00.000Z", duration: 15 },
  ],
};

// ============================================================
// statusForReading
// ============================================================

describe("statusForReading", () => {
  const targets = { fasting: 95, pp1h: 140, pp2h: 120 };

  it("공복이 목표 미만이면 good", () => {
    expect(statusForReading(90, "fasting", targets)).toBe("good");
  });

  it("공복이 목표 이상이면 over", () => {
    expect(statusForReading(95, "fasting", targets)).toBe("over");
    expect(statusForReading(100, "fasting", targets)).toBe("over");
  });

  it("식후 1h가 목표 미만이면 good", () => {
    expect(statusForReading(139, "pp1h_breakfast", targets)).toBe("good");
    expect(statusForReading(100, "pp1h_lunch", targets)).toBe("good");
  });

  it("식후 1h가 목표 이상이면 over", () => {
    expect(statusForReading(140, "pp1h_dinner", targets)).toBe("over");
  });

  it("식후 2h가 목표 이상이면 over", () => {
    expect(statusForReading(120, "pp2h_breakfast", targets)).toBe("over");
  });

  it("식후 2h가 목표 미만이면 good", () => {
    expect(statusForReading(119, "pp2h_lunch", targets)).toBe("good");
  });
});

// ============================================================
// currentWeek
// ============================================================

describe("currentWeek", () => {
  it("셋업 직후엔 weekAtSetup 그대로 반환", () => {
    const settings: Settings = {
      id: 1,
      name: "",
      weekAtSetup: 28,
      setupDate: new Date().toISOString(),
      setupDone: true,
      targetFasting: 95,
      targetPp1h: 140,
      targetPp2h: 120,
      v0MigrationDone: true,
    };
    expect(currentWeek(settings)).toBe(28);
  });

  it("7일 후엔 weekAtSetup + 1", () => {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    const settings: Settings = {
      id: 1,
      name: "",
      weekAtSetup: 28,
      setupDate: past.toISOString(),
      setupDone: true,
      targetFasting: 95,
      targetPp1h: 140,
      targetPp2h: 120,
      v0MigrationDone: true,
    };
    expect(currentWeek(settings)).toBe(29);
  });

  it("setupDate 없으면 weekAtSetup 반환", () => {
    const settings = {
      id: 1 as const,
      name: "",
      weekAtSetup: 30,
      setupDate: "",
      setupDone: true,
      targetFasting: 95,
      targetPp1h: 140,
      targetPp2h: 120,
      v0MigrationDone: true,
    };
    expect(currentWeek(settings)).toBe(30);
  });
});

// ============================================================
// migrateV0ToV1
// ============================================================

describe("migrateV0ToV1", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearDb();
  });

  it("v0 데이터 없으면 migrated:false 반환, DB 비어있음", async () => {
    const result = await migrateV0ToV1();
    expect(result.migrated).toBe(false);
    expect(result.recordCount).toBe(0);
    const glucose = await db.glucose.toArray();
    expect(glucose).toHaveLength(0);
  });

  it("v0 데이터 있으면 모든 레코드를 Dexie로 이전", async () => {
    setV0LocalStorage(V0_SAMPLE);
    const result = await migrateV0ToV1();

    expect(result.migrated).toBe(true);
    expect(result.recordCount).toBe(4); // 2 glucose + 1 meal + 1 exercise
    expect(result.hadSetup).toBe(true);

    const glucose = await db.glucose.toArray();
    expect(glucose).toHaveLength(2);
    expect(glucose.find((g) => g.id === "g1")?.value).toBe(88);

    const meals = await db.meals.toArray();
    expect(meals).toHaveLength(1);
    expect(meals[0].mealTime).toBe("breakfast");

    const exercise = await db.exercise.toArray();
    expect(exercise).toHaveLength(1);
    expect(exercise[0].duration).toBe(15);
  });

  it("마이그레이션 후 settings.setupDone = true, targets 반영됨", async () => {
    setV0LocalStorage(V0_SAMPLE);
    await migrateV0ToV1();

    const settings = await getSettings();
    expect(settings.setupDone).toBe(true);
    expect(settings.targetFasting).toBe(95);
    expect(settings.targetPp1h).toBe(140);
    expect(settings.v0MigrationDone).toBe(true);
  });

  it("두 번 호출해도 중복 이전 없음 (idempotent)", async () => {
    setV0LocalStorage(V0_SAMPLE);
    await migrateV0ToV1();
    await migrateV0ToV1(); // second call — should no-op

    const glucose = await db.glucose.toArray();
    expect(glucose).toHaveLength(2); // not 4
  });

  it("잘못된 context를 가진 glucose 레코드는 필터링됨", async () => {
    setV0LocalStorage({
      ...V0_SAMPLE,
      glucose: [
        { id: "g1", ts: "2025-05-01T07:00:00.000Z", value: 88, context: "fasting" },
        { id: "g2", ts: "2025-05-01T08:00:00.000Z", value: 999, context: "invalid_context" },
      ],
    });
    await migrateV0ToV1();
    const glucose = await db.glucose.toArray();
    expect(glucose).toHaveLength(1);
    expect(glucose[0].id).toBe("g1");
  });

  it("v0 JSON 파싱 실패해도 앱 동작 유지, migrated:false", async () => {
    localStorage.setItem("gdm_v1", "{ broken json %%");
    const result = await migrateV0ToV1();
    expect(result.migrated).toBe(false);
    const settings = await getSettings();
    expect(settings.v0MigrationDone).toBe(true);
  });

  it("setupDone:false 인 v0 데이터는 setupDone 이전하지 않음", async () => {
    setV0LocalStorage({ ...V0_SAMPLE, setupDone: false });
    const result = await migrateV0ToV1();
    expect(result.hadSetup).toBe(false);
    const settings = await getSettings();
    expect(settings.setupDone).toBe(false);
    expect(settings.v0MigrationDone).toBe(true);
  });
});

// ============================================================
// notificationStatusLabel (순수 함수)
// ============================================================

describe("notificationStatusLabel", () => {
  it("granted → 앱 오픈 안내 메시지", () => {
    expect(notificationStatusLabel("granted")).toContain("열어두면");
  });
  it("denied → 설정 안내 메시지", () => {
    expect(notificationStatusLabel("denied")).toContain("설정");
  });
  it("unsupported → 지원 안 됨 메시지", () => {
    expect(notificationStatusLabel("unsupported")).toContain("지원");
  });
  it("ios-not-installed → 홈 화면 추가 안내", () => {
    expect(notificationStatusLabel("ios-not-installed")).toContain("홈 화면");
  });
  it("default → 팝업 안내 메시지", () => {
    expect(notificationStatusLabel("default")).toContain("팝업");
  });
});

// ============================================================
// repository smoke tests
// ============================================================

describe("glucose repository", () => {
  beforeEach(async () => {
    await db.glucose.clear();
    await db.settings.clear();
  });

  it("addGlucose → getGlucoseInRange로 조회", async () => {
    const from = new Date("2025-05-01T00:00:00Z");
    await addGlucose(92, "fasting", "2025-05-01T07:00:00Z");
    await addGlucose(138, "pp1h_breakfast", "2025-05-01T10:00:00Z");

    const records = await getGlucoseInRange(from);
    expect(records).toHaveLength(2);
  });

  it("getTodayGlucose는 오늘 날짜 기록만 반환", async () => {
    // yesterday
    await addGlucose(85, "fasting", new Date(Date.now() - 86400000).toISOString());
    // today
    await addGlucose(90, "fasting");

    const today = await getTodayGlucose();
    expect(today).toHaveLength(1);
    expect(today[0].value).toBe(90);
  });
});

describe("meal repository", () => {
  beforeEach(async () => {
    await db.meals.clear();
  });

  it("addMeal → getRecentMeals에 포함됨", async () => {
    await addMeal({ photo: null, mealTime: "lunch", orderOk: true, note: "테스트" });
    const meals = await getRecentMeals(5);
    expect(meals).toHaveLength(1);
    expect(meals[0].mealTime).toBe("lunch");
    expect(meals[0].orderOk).toBe(true);
  });
});

describe("exercise repository", () => {
  beforeEach(async () => {
    await db.exercise.clear();
  });

  it("addExercise → getExerciseInRange로 조회", async () => {
    await addExercise(15);
    const from = new Date(Date.now() - 60000);
    const records = await getExerciseInRange(from);
    expect(records).toHaveLength(1);
    expect(records[0].duration).toBe(15);
  });
});

// ============================================================
// computeInsights
// ============================================================

describe("computeInsights", () => {
  const targets = { fasting: 95, pp1h: 140, pp2h: 120 };

  it("측정 4건 미만이면 베이스라인 메시지 반환", () => {
    const result = computeInsights({
      glucoseRecords: [
        { id: "1", ts: new Date().toISOString(), value: 90, context: "fasting" },
      ],
      mealRecords: [],
      exerciseRecords: [],
      targets,
    });
    expect(result[0]).toContain("베이스라인");
  });

  it("공복 초과율 50% 이상이면 인슐린 권고 메시지", () => {
    const base = new Date();
    const records = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      ts: new Date(base.getTime() - i * 86400000).toISOString(),
      value: i % 2 === 0 ? 100 : 88, // 4개 초과 / 4개 정상 → 50%
      context: "fasting" as const,
    }));
    const result = computeInsights({
      glucoseRecords: records,
      mealRecords: [],
      exerciseRecords: [],
      targets,
    });
    expect(result[0]).toContain("인슐린");
  });

  it("모두 목표 내이면 격려 메시지", () => {
    const base = new Date();
    const fastings = Array.from({ length: 5 }, (_, i) => ({
      id: "f" + i,
      ts: new Date(base.getTime() - i * 86400000).toISOString(),
      value: 85,
      context: "fasting" as const,
    }));
    const pp1hs = Array.from({ length: 5 }, (_, i) => ({
      id: "p" + i,
      ts: new Date(base.getTime() - i * 86400000 + 3600000).toISOString(),
      value: 120,
      context: "pp1h_breakfast" as const,
    }));
    const result = computeInsights({
      glucoseRecords: [...fastings, ...pp1hs],
      mealRecords: [],
      exerciseRecords: [],
      targets,
    });
    expect(result[0]).toContain("잘 관리");
  });
});
