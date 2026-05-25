import { db, type GlucoseContext, type GlucoseRecord } from "@/lib/db";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function addGlucose(
  value: number,
  context: GlucoseContext,
  ts?: string
): Promise<GlucoseRecord> {
  const record: GlucoseRecord = {
    id: uid(),
    ts: ts ?? new Date().toISOString(),
    value,
    context,
  };
  await db.glucose.add(record);
  return record;
}

export async function getGlucoseInRange(
  from: Date,
  to: Date = new Date()
): Promise<GlucoseRecord[]> {
  return db.glucose
    .where("ts")
    .between(from.toISOString(), to.toISOString(), true, true)
    .toArray();
}

export async function getTodayGlucose(): Promise<GlucoseRecord[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return getGlucoseInRange(start);
}

export async function deleteGlucose(id: string) {
  await db.glucose.delete(id);
}

export async function getAllGlucose(): Promise<GlucoseRecord[]> {
  return db.glucose.orderBy("ts").toArray();
}
