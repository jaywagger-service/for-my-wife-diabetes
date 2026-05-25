import Dexie, { type EntityTable } from "dexie";

export type GlucoseContext =
  | "fasting"
  | "pp1h_breakfast"
  | "pp1h_lunch"
  | "pp1h_dinner"
  | "pp2h_breakfast"
  | "pp2h_lunch"
  | "pp2h_dinner"
  | "random";

export type MealTime = "breakfast" | "lunch" | "dinner" | "snack";

export interface GlucoseRecord {
  id: string;
  ts: string; // ISO string
  value: number;
  context: GlucoseContext;
}

export interface MealRecord {
  id: string;
  ts: string;
  photo: string | null; // base64 data URL
  mealTime: MealTime;
  orderOk: boolean;
  note: string;
}

export interface ExerciseRecord {
  id: string;
  ts: string;
  duration: number; // minutes
}

export interface Settings {
  id: 1; // singleton
  name: string;
  weekAtSetup: number;
  setupDate: string;
  setupDone: boolean;
  targetFasting: number;
  targetPp1h: number;
  targetPp2h: number;
  v0MigrationDone: boolean;
}

class GdmDatabase extends Dexie {
  glucose!: EntityTable<GlucoseRecord, "id">;
  meals!: EntityTable<MealRecord, "id">;
  exercise!: EntityTable<ExerciseRecord, "id">;
  settings!: EntityTable<Settings, "id">;

  constructor() {
    super("gdm_v2");
    this.version(1).stores({
      glucose: "id, ts, context",
      meals: "id, ts, mealTime",
      exercise: "id, ts",
      settings: "id",
    });
  }
}

export const db = new GdmDatabase();

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1);
  if (s) return s;
  const defaults: Settings = {
    id: 1,
    name: "",
    weekAtSetup: 28,
    setupDate: new Date().toISOString(),
    setupDone: false,
    targetFasting: 95,
    targetPp1h: 140,
    targetPp2h: 120,
    v0MigrationDone: false,
  };
  await db.settings.put(defaults);
  return defaults;
}

export async function updateSettings(patch: Partial<Omit<Settings, "id">>) {
  await db.settings.update(1, patch);
}
