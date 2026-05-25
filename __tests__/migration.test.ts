import { describe, it, expect, beforeEach, vi } from "vitest";
import { db, getSettings } from "@/lib/db";
import { migrateV0ToV1 } from "@/lib/migration/v0-to-v1";
import { statusForReading, currentWeek } from "@/lib/utils";
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
