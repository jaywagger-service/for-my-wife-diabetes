"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, type Settings } from "@/lib/db";
import { BottomNav } from "@/components/ui/BottomNav";
import { ToastProvider } from "@/components/ui/Toast";
import {
  daysAgo,
  dayKey,
  todayKey,
  fmtTime,
  currentWeek,
  statusForReading,
  contextShortLabel,
  computeInsights,
} from "@/lib/utils";
import type { GlucoseContext } from "@/lib/db";
import { cn } from "@/lib/utils";

const HOME_SLOTS: { context: GlucoseContext; label: string }[] = [
  { context: "fasting", label: "공복" },
  { context: "pp1h_breakfast", label: "아침후" },
  { context: "pp1h_lunch", label: "점심후" },
  { context: "pp1h_dinner", label: "저녁후" },
];

export function HomeClient() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [insightIdx, setInsightIdx] = useState(0);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      if (!s.setupDone) router.replace("/welcome");
    });
  }, [router]);

  const cutoff7 = daysAgo(7);
  const todayStr = todayKey();
  const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const todayGlucose = useLiveQuery(
    () => db.glucose.where("ts").aboveOrEqual(todayStart.toISOString()).toArray(),
    []
  );

  const weekGlucose = useLiveQuery(
    () => db.glucose.where("ts").aboveOrEqual(cutoff7.toISOString()).toArray(),
    []
  );

  const weekExercise = useLiveQuery(
    () => db.exercise.where("ts").aboveOrEqual(cutoff7.toISOString()).toArray(),
    []
  );

  const recentMeals = useLiveQuery(
    () => db.meals.orderBy("ts").reverse().limit(8).toArray(),
    []
  );

  const weekMeals = useLiveQuery(
    () => db.meals.where("ts").aboveOrEqual(cutoff7.toISOString()).toArray(),
    []
  );

  if (!settings) return null;

  const targets = {
    fasting: settings.targetFasting,
    pp1h: settings.targetPp1h,
    pp2h: settings.targetPp2h,
  };

  // Today readings
  const todayFiltered = (todayGlucose ?? []).filter(
    (g) => dayKey(g.ts) === todayStr
  );

  // Week stats
  const weekReads = weekGlucose ?? [];
  const onTarget = weekReads.filter(
    (r) => statusForReading(r.value, r.context, targets) === "good"
  ).length;
  const rate = weekReads.length ? Math.round((onTarget / weekReads.length) * 100) : 0;
  const ppReads = weekReads.filter((r) => r.context.startsWith("pp1h"));
  const avgPp = ppReads.length
    ? Math.round(ppReads.reduce((s, r) => s + r.value, 0) / ppReads.length)
    : 0;
  const exerciseDays = new Set((weekExercise ?? []).map((e) => dayKey(e.ts))).size;

  // Insights
  const insights = computeInsights({
    glucoseRecords: weekReads,
    mealRecords: weekMeals ?? [],
    exerciseRecords: weekExercise ?? [],
    targets,
  });

  // Greeting
  const hour = new Date().getHours();
  const greet =
    hour < 11
      ? "좋은 아침이에요"
      : hour < 17
      ? "오늘도 차분하게"
      : hour < 21
      ? "저녁이에요"
      : "편안한 밤 되세요";

  const week = currentWeek(settings);

  return (
    <div className="min-h-dvh bg-bg">
      <ToastProvider />
      <div className="max-w-[480px] mx-auto px-[18px] pb-[120px] pt-0">
        {/* Header */}
        <div className="pt-4 pb-2">
          <div className="text-[13px] text-ink-faint tracking-widest uppercase">
            {new Date().toLocaleDateString("ko-KR", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="text-xl font-semibold tracking-tight mt-0.5">
            {greet}
            {settings.name && (
              <span className="text-accent italic font-normal">, {settings.name}</span>
            )}.
          </div>
          <div className="text-[13px] text-ink-soft mt-0.5">
            임신 {week}주차
          </div>
        </div>

        {/* Insight card */}
        {insights.length > 0 && (
          <div
            className="rounded-lg p-[18px_20px] mb-3.5 border border-line cursor-pointer"
            style={{ background: "linear-gradient(135deg, #fdfbf6 0%, #f4ede1 100%)" }}
            onClick={() => setInsightIdx((i) => (i + 1) % insights.length)}
          >
            <div className="text-[11px] tracking-[0.1em] text-gold font-semibold mb-2 uppercase flex items-center justify-between">
              오늘의 인사이트
              {insights.length > 1 && (
                <span className="text-ink-faint normal-case font-normal">
                  {insightIdx + 1}/{insights.length} →
                </span>
              )}
            </div>
            <div
              className="text-sm leading-[1.55] text-ink"
              dangerouslySetInnerHTML={{
                __html: insights[insightIdx].replace(
                  /\*\*(.+?)\*\*/g,
                  '<strong style="color:#3f5448">$1</strong>'
                ),
              }}
            />
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          <button
            className="bg-accent text-bg rounded-DEFAULT p-4 text-left flex flex-col gap-1 active:scale-[0.97] transition-transform"
            onClick={() => router.push("/glucose")}
          >
            <div className="text-xl mb-1">●</div>
            <div className="text-[15px] font-semibold tracking-tight">혈당 기록</div>
            <div className="text-[11px] text-bg/70 tracking-widest uppercase">measure</div>
          </button>
          <button
            className="bg-card border border-line rounded-DEFAULT p-4 text-left flex flex-col gap-1 active:scale-[0.97] transition-transform"
            onClick={() => router.push("/meal")}
          >
            <div className="text-xl mb-1">◷</div>
            <div className="text-[15px] font-semibold tracking-tight">식사 기록</div>
            <div className="text-[11px] text-ink-faint tracking-widest uppercase">meal · photo</div>
          </button>
          <button
            className="bg-card border border-line rounded-DEFAULT p-4 text-left flex flex-col gap-1 active:scale-[0.97] transition-transform"
            onClick={() => router.push("/timer")}
          >
            <div className="text-xl mb-1">↗</div>
            <div className="text-[15px] font-semibold tracking-tight">식후 산책</div>
            <div className="text-[11px] text-ink-faint tracking-widest uppercase">walk timer</div>
          </button>
          <button
            className="bg-card border border-line rounded-DEFAULT p-4 text-left flex flex-col gap-1 active:scale-[0.97] transition-transform"
            onClick={() => router.push("/report")}
          >
            <div className="text-xl mb-1">⌬</div>
            <div className="text-[15px] font-semibold tracking-tight">리포트</div>
            <div className="text-[11px] text-ink-faint tracking-widest uppercase">for doctor</div>
          </button>
        </div>

        {/* Today's readings */}
        <div className="bg-card rounded-lg p-5 mb-3.5 shadow-[0_1px_0_#e0d9cc]">
          <div className="text-[13px] text-ink-soft tracking-[0.03em] font-medium mb-3.5 flex items-center justify-between">
            오늘의 혈당
            <span className="text-[12px] text-ink-faint font-normal">
              {todayFiltered.length}/4
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {HOME_SLOTS.map((slot) => {
              const reading = todayFiltered.find(
                (r) => r.context === slot.context
              );
              const stat = reading
                ? statusForReading(reading.value, reading.context, targets)
                : null;
              return (
                <div
                  key={slot.context}
                  className={cn(
                    "text-center py-3 px-1 rounded-[12px] min-h-[76px] flex flex-col justify-center",
                    stat === "over"
                      ? "bg-warn-bg"
                      : stat === "good"
                      ? "bg-good-bg"
                      : "bg-bg-soft"
                  )}
                >
                  <div
                    className={cn(
                      "text-[22px] font-bold tracking-[-0.03em] font-num leading-none",
                      stat === "over"
                        ? "text-warn"
                        : stat === "good"
                        ? "text-good"
                        : "text-ink-faint font-normal text-[18px]"
                    )}
                  >
                    {reading?.value ?? "--"}
                  </div>
                  <div className="text-[10px] text-ink-soft tracking-[0.04em] mt-1.5 uppercase">
                    {slot.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Week stats */}
        <div className="bg-card rounded-lg p-5 mb-3.5 shadow-[0_1px_0_#e0d9cc]">
          <div className="text-[13px] text-ink-soft tracking-[0.03em] font-medium mb-3.5 flex items-center justify-between">
            지난 7일
            <span className="text-[12px] text-ink-faint font-normal">
              {weekReads.length}회 측정
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { val: rate + "%", label: "목표 달성" },
              { val: avgPp || "--", label: "식후 평균" },
              { val: exerciseDays, label: "산책일" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-[26px] font-bold tracking-[-0.02em] font-num leading-none">
                  {val}
                </div>
                <div className="text-[11px] text-ink-faint tracking-[0.04em] mt-1.5 uppercase">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent meals */}
        <div className="mb-3.5">
          <div className="text-[13px] text-ink-soft tracking-[0.03em] font-medium mb-3.5 px-1">
            최근 식사
          </div>
          <div
            className="flex gap-2.5 overflow-x-auto -mx-[18px] px-[18px] pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {(recentMeals ?? []).length === 0
              ? [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex-none w-[100px] h-[100px] bg-bg-soft rounded-[12px] border border-dashed border-line flex items-center justify-center text-ink-faint text-2xl"
                  >
                    +
                  </div>
                ))
              : (recentMeals ?? []).map((m) => (
                  <div
                    key={m.id}
                    className="flex-none w-[100px] bg-card rounded-[12px] overflow-hidden border border-line"
                  >
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo}
                        alt=""
                        className="w-full h-[100px] object-cover"
                      />
                    ) : (
                      <div className="h-[100px] bg-bg-soft flex items-center justify-center text-ink-faint text-2xl">
                        🍽️
                      </div>
                    )}
                    <div className="p-2">
                      <div className="text-[11px] text-ink-faint tracking-[0.04em]">
                        {fmtTime(m.ts)}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] mt-0.5",
                          m.orderOk ? "text-good" : "text-warn"
                        )}
                      >
                        {m.orderOk ? "✓ 순서" : "✗ 순서"}
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
