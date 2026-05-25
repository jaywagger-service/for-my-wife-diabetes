import { db, getSettings, updateSettings } from "@/lib/db";
import type {
  GlucoseContext,
  GlucoseRecord,
  MealRecord,
  ExerciseRecord,
} from "@/lib/db";

const V0_KEY = "gdm_v1";

interface V0Profile {
  name?: string;
  weekAtSetup?: number;
  setupDate?: string;
}

interface V0Targets {
  fasting?: number;
  pp1h?: number;
  pp2h?: number;
}

interface V0GlucoseRecord {
  id: string;
  ts: string;
  value: number;
  context: string;
}

interface V0MealRecord {
  id: string;
  ts: string;
  photo?: string | null;
  mealTime: string;
  orderOk?: boolean;
  note?: string;
}

interface V0ExerciseRecord {
  id: string;
  ts: string;
  duration: number;
}

interface V0State {
  setupDone?: boolean;
  profile?: V0Profile;
  targets?: V0Targets;
  glucose?: V0GlucoseRecord[];
  meals?: V0MealRecord[];
  exercise?: V0ExerciseRecord[];
}

export interface MigrationResult {
  migrated: boolean;
  recordCount: number;
  hadSetup: boolean;
}

const VALID_CONTEXTS = new Set<string>([
  "fasting",
  "pp1h_breakfast",
  "pp1h_lunch",
  "pp1h_dinner",
  "pp2h_breakfast",
  "pp2h_lunch",
  "pp2h_dinner",
  "random",
]);

const VALID_MEAL_TIMES = new Set<string>([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

function sanitizeGlucose(records: V0GlucoseRecord[]): GlucoseRecord[] {
  return records
    .filter(
      (r) =>
        r.id &&
        r.ts &&
        typeof r.value === "number" &&
        VALID_CONTEXTS.has(r.context)
    )
    .map((r) => ({
      id: r.id,
      ts: r.ts,
      value: r.value,
      context: r.context as GlucoseContext,
    }));
}

function sanitizeMeals(records: V0MealRecord[]): MealRecord[] {
  return records
    .filter((r) => r.id && r.ts && VALID_MEAL_TIMES.has(r.mealTime))
    .map((r) => ({
      id: r.id,
      ts: r.ts,
      photo: r.photo ?? null,
      mealTime: r.mealTime as MealRecord["mealTime"],
      orderOk: r.orderOk ?? false,
      note: r.note ?? "",
    }));
}

function sanitizeExercise(records: V0ExerciseRecord[]): ExerciseRecord[] {
  return records
    .filter(
      (r) => r.id && r.ts && typeof r.duration === "number" && r.duration > 0
    )
    .map((r) => ({
      id: r.id,
      ts: r.ts,
      duration: r.duration,
    }));
}

/**
 * Reads v0 localStorage data and imports into Dexie.
 * Runs at most once — subsequent calls return { migrated: false } immediately.
 */
export async function migrateV0ToV1(): Promise<MigrationResult> {
  // Ensure settings singleton exists, then check flag
  const settings = await getSettings();
  if (settings.v0MigrationDone) {
    return { migrated: false, recordCount: 0, hadSetup: settings.setupDone };
  }

  // Read v0 data from localStorage (browser-only)
  let raw: string | null = null;
  if (typeof window !== "undefined" && window.localStorage) {
    raw = window.localStorage.getItem(V0_KEY);
  }

  if (!raw) {
    await updateSettings({ v0MigrationDone: true });
    return { migrated: false, recordCount: 0, hadSetup: false };
  }

  let v0: V0State;
  try {
    v0 = JSON.parse(raw) as V0State;
  } catch {
    await updateSettings({ v0MigrationDone: true });
    return { migrated: false, recordCount: 0, hadSetup: false };
  }

  const glucose = sanitizeGlucose(v0.glucose ?? []);
  const meals = sanitizeMeals(v0.meals ?? []);
  const exercise = sanitizeExercise(v0.exercise ?? []);
  const hadSetup = Boolean(v0.setupDone);
  const recordCount = glucose.length + meals.length + exercise.length;

  await db.transaction(
    "rw",
    [db.glucose, db.meals, db.exercise, db.settings],
    async () => {
      // bulkPut is idempotent — safe even if called unexpectedly twice
      if (glucose.length) await db.glucose.bulkPut(glucose);
      if (meals.length) await db.meals.bulkPut(meals);
      if (exercise.length) await db.exercise.bulkPut(exercise);

      if (hadSetup) {
        await updateSettings({
          name: v0.profile?.name ?? "",
          weekAtSetup: v0.profile?.weekAtSetup ?? 28,
          setupDate: v0.profile?.setupDate ?? new Date().toISOString(),
          setupDone: true,
          targetFasting: v0.targets?.fasting ?? 95,
          targetPp1h: v0.targets?.pp1h ?? 140,
          targetPp2h: v0.targets?.pp2h ?? 120,
          v0MigrationDone: true,
        });
      } else {
        await updateSettings({ v0MigrationDone: true });
      }
    }
  );

  return { migrated: true, recordCount, hadSetup };
}
