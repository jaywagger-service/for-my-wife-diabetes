import { db, type ExerciseRecord } from "@/lib/db";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function addExercise(durationMin: number): Promise<ExerciseRecord> {
  const record: ExerciseRecord = {
    id: uid(),
    ts: new Date().toISOString(),
    duration: durationMin,
  };
  await db.exercise.add(record);
  return record;
}

export async function getExerciseInRange(
  from: Date,
  to: Date = new Date()
): Promise<ExerciseRecord[]> {
  return db.exercise
    .where("ts")
    .between(from.toISOString(), to.toISOString(), true, true)
    .toArray();
}

export async function getAllExercise(): Promise<ExerciseRecord[]> {
  return db.exercise.orderBy("ts").toArray();
}
