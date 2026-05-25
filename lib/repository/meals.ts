import { db, type MealRecord, type MealTime } from "@/lib/db";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function addMeal(
  data: Omit<MealRecord, "id" | "ts">
): Promise<MealRecord> {
  const record: MealRecord = {
    id: uid(),
    ts: new Date().toISOString(),
    ...data,
  };
  await db.meals.add(record);
  return record;
}

export async function getMealsInRange(
  from: Date,
  to: Date = new Date()
): Promise<MealRecord[]> {
  return db.meals
    .where("ts")
    .between(from.toISOString(), to.toISOString(), true, true)
    .toArray();
}

export async function getRecentMeals(limit = 8): Promise<MealRecord[]> {
  const all = await db.meals.orderBy("ts").reverse().limit(limit).toArray();
  return all;
}

export async function deleteMeal(id: string) {
  await db.meals.delete(id);
}

export async function getAllMeals(): Promise<MealRecord[]> {
  return db.meals.orderBy("ts").toArray();
}

export function mealTimeLabel(mt: MealTime): string {
  return { breakfast: "아침", lunch: "점심", dinner: "저녁", snack: "간식" }[
    mt
  ];
}

export function mealTimeIcon(mt: MealTime): string {
  return { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" }[mt];
}
