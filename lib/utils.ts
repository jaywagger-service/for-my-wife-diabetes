import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { GlucoseContext, GlucoseRecord, MealRecord, ExerciseRecord, Settings } from "@/lib/db";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function fmtTime(ts: string): string {
  const d = new Date(ts);
  return (
    d.getHours().toString().padStart(2, "0") +
    ":" +
    d.getMinutes().toString().padStart(2, "0")
  );
}

export function fmtDate(ts: string): string {
  const d = new Date(ts);
  return d.getMonth() + 1 + "/" + d.getDate();
}

export function dayKey(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return (
    d.getFullYear() +
    "-" +
    (d.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    d.getDate().toString().padStart(2, "0")
  );
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function currentWeek(settings: Settings): number {
  if (!settings.setupDate) return settings.weekAtSetup;
  const setup = new Date(settings.setupDate);
  const now = new Date();
  const weeksDiff = Math.floor(
    (now.getTime() - setup.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return settings.weekAtSetup + weeksDiff;
}

export function statusForReading(
  value: number,
  context: GlucoseContext,
  targets: { fasting: number; pp1h: number; pp2h: number }
): "over" | "good" {
  if (context === "fasting") return value >= targets.fasting ? "over" : "good";
  if (context.startsWith("pp1h")) return value >= targets.pp1h ? "over" : "good";
  if (context.startsWith("pp2h")) return value >= targets.pp2h ? "over" : "good";
  return "good";
}

export function contextLabel(context: GlucoseContext): string {
  const map: Record<GlucoseContext, string> = {
    fasting: "공복",
    pp1h_breakfast: "아침 식후 1h",
    pp1h_lunch: "점심 식후 1h",
    pp1h_dinner: "저녁 식후 1h",
    pp2h_breakfast: "아침 식후 2h",
    pp2h_lunch: "점심 식후 2h",
    pp2h_dinner: "저녁 식후 2h",
    random: "수시",
  };
  return map[context] ?? context;
}

export function contextShortLabel(context: GlucoseContext): string {
  const map: Record<GlucoseContext, string> = {
    fasting: "공복",
    pp1h_breakfast: "아침후",
    pp1h_lunch: "점심후",
    pp1h_dinner: "저녁후",
    pp2h_breakfast: "아침2h",
    pp2h_lunch: "점심2h",
    pp2h_dinner: "저녁2h",
    random: "수시",
  };
  return map[context] ?? context;
}

export function autoDetectContext(): GlucoseContext | null {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return "fasting";
  if (h >= 10 && h < 14) return "pp1h_breakfast";
  if (h >= 14 && h < 18) return "pp1h_lunch";
  if (h >= 18 && h < 23) return "pp1h_dinner";
  return null;
}

export function autoDetectMealTime(): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return "breakfast";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

// =================== INSIGHTS ===================

interface InsightData {
  glucoseRecords: GlucoseRecord[];
  mealRecords: MealRecord[];
  exerciseRecords: ExerciseRecord[];
  targets: { fasting: number; pp1h: number; pp2h: number };
}

export function computeInsights(data: InsightData): string[] {
  const { glucoseRecords, mealRecords, exerciseRecords, targets } = data;
  const out: string[] = [];

  if (glucoseRecords.length < 4) {
    out.push("첫 일주일은 베이스라인을 잡는 시간이에요. 매일 4회 측정해보세요.");
    return out;
  }

  const fastings = glucoseRecords.filter((r) => r.context === "fasting");
  const pp1hs = glucoseRecords.filter((r) => r.context.startsWith("pp1h"));

  const fastingHigh = fastings.filter((r) => r.value >= targets.fasting).length;
  const pp1hHigh = pp1hs.filter((r) => r.value >= targets.pp1h).length;
  const fastingRate = fastings.length ? fastingHigh / fastings.length : 0;
  const pp1hRate = pp1hs.length ? pp1hHigh / pp1hs.length : 0;

  // 1. Insulin risk
  if (fastingRate >= 0.5 || pp1hRate >= 0.5) {
    out.push(
      "지난 7일 동안 **목표 초과 측정이 절반 이상**이에요. 산부인과에 빨리 보고해서 인슐린 도입 여부를 상의해보세요."
    );
  } else if ((fastingRate + pp1hRate) / 2 >= 0.3) {
    out.push(
      "식후 1시간 혈당이 자주 목표를 넘고 있어요. 다음 진료 때 **식사 일기와 함께 상의**하시는 게 좋겠어요."
    );
  }

  // 2. Meal order vs glucose
  if (mealRecords.length >= 6) {
    const okVals: number[] = [];
    const noVals: number[] = [];
    mealRecords.forEach((m) => {
      const t = new Date(m.ts).getTime();
      const matched = glucoseRecords.find((r) => {
        const rt = new Date(r.ts).getTime();
        return (
          rt > t + 30 * 60000 &&
          rt < t + 120 * 60000 &&
          r.context.startsWith("pp1h")
        );
      });
      if (matched) {
        (m.orderOk ? okVals : noVals).push(matched.value);
      }
    });
    if (okVals.length >= 2 && noVals.length >= 2) {
      const avgOk = Math.round(okVals.reduce((s, v) => s + v, 0) / okVals.length);
      const avgNo = Math.round(noVals.reduce((s, v) => s + v, 0) / noVals.length);
      if (avgNo - avgOk >= 10) {
        out.push(
          `식사 순서를 지킨 날 식후 평균 **${avgOk}**, 안 지킨 날 **${avgNo}**이에요. ${avgNo - avgOk} mg/dL 차이.`
        );
      }
    }
  }

  // 3. Exercise impact
  const walkedPp: number[] = [];
  const unwalkedPp: number[] = [];
  glucoseRecords
    .filter((r) => r.context.startsWith("pp1h"))
    .forEach((r) => {
      const rt = new Date(r.ts).getTime();
      const hasWalk = exerciseRecords.some((e) => {
        const et = new Date(e.ts).getTime();
        return Math.abs(et - rt) < 90 * 60000;
      });
      (hasWalk ? walkedPp : unwalkedPp).push(r.value);
    });
  if (walkedPp.length >= 2 && unwalkedPp.length >= 2) {
    const avgW = Math.round(walkedPp.reduce((s, v) => s + v, 0) / walkedPp.length);
    const avgU = Math.round(unwalkedPp.reduce((s, v) => s + v, 0) / unwalkedPp.length);
    if (avgU - avgW >= 10) {
      out.push(
        `식후 산책한 끼니 평균 **${avgW}**, 안 한 끼니 **${avgU}**. 산책이 ${avgU - avgW} mg/dL 낮춰주고 있어요.`
      );
    }
  }

  // 4. Encouragement
  if (out.length === 0) {
    const fastingAvg = fastings.length
      ? Math.round(fastings.reduce((s, r) => s + r.value, 0) / fastings.length)
      : 0;
    const pp1hAvg = pp1hs.length
      ? Math.round(pp1hs.reduce((s, r) => s + r.value, 0) / pp1hs.length)
      : 0;
    if (fastingAvg && pp1hAvg) {
      out.push(
        `지난 7일 공복 평균 **${fastingAvg}**, 식후 1시간 평균 **${pp1hAvg}**. 잘 관리하고 있어요.`
      );
    }
  }

  return out;
}

// =================== IMAGE RESIZE ===================

export function resizeImage(
  file: File,
  maxDim = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = (h * maxDim) / w;
          w = maxDim;
        } else if (h > maxDim) {
          w = (w * maxDim) / h;
          h = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
