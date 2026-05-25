"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, type Settings } from "@/lib/db";
import { BottomNav } from "@/components/ui/BottomNav";
import { ToastProvider } from "@/components/ui/Toast";
import {
  daysAgo,
  dayKey,
  todayKey,
  fmtTime,
  statusForReading,
  contextLabel,
  cn,
} from "@/lib/utils";
import type { GlucoseContext } from "@/lib/db";

type Period = 7 | 14 | 30;
type RecordType = "glucose" | "meal" | "exercise";

export default function TrendPage() {
  const [period, setPeriod] = useState<Period>(7);
  const [recType, setRecType] = useState<RecordType>("glucose");
  const [settings, setSettings] = useState<Settings | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const cutoff = daysAgo(period);

  const glucoseRecords = useLiveQuery(
    () => db.glucose.where("ts").aboveOrEqual(cutoff.toISOString()).toArray(),
    [period]
  );
  const mealRecords = useLiveQuery(
    () => db.meals.where("ts").aboveOrEqual(cutoff.toISOString()).toArray(),
    [period]
  );
  const exerciseRecords = useLiveQuery(
    () => db.exercise.where("ts").aboveOrEqual(cutoff.toISOString()).toArray(),
    [period]
  );

  const targets = settings
    ? { fasting: settings.targetFasting, pp1h: settings.targetPp1h, pp2h: settings.targetPp2h }
    : { fasting: 95, pp1h: 140, pp2h: 120 };

  useEffect(() => {
    if (!canvasRef.current || !glucoseRecords) return;
    drawChart(canvasRef.current, glucoseRecords, period, targets);
  }, [glucoseRecords, period, targets]);

  const reads = (glucoseRecords ?? []).sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
  const meals = (mealRecords ?? []).sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
  const exercises = (exerciseRecords ?? []).sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );

  function dayLabel(ts: string) {
    const day = dayKey(ts);
    if (day === todayKey()) return "오늘";
    const d = new Date(ts);
    const yesterday = daysAgo(1);
    if (day === dayKey(yesterday)) return "어제";
    return (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + ["일","월","화","수","목","금","토"][d.getDay()] + "요일";
  }

  function renderList() {
    if (recType === "glucose") {
      if (!reads.length) return <EmptyState />;
      let lastDay = "";
      return reads.map((item) => {
        const day = dayKey(item.ts);
        const showDivider = day !== lastDay;
        lastDay = day;
        const stat = statusForReading(item.value, item.context, targets);
        return (
          <div key={item.id}>
            {showDivider && (
              <div className="text-[11px] text-ink-faint tracking-widest uppercase mt-[18px] mb-2.5 px-1">
                {dayLabel(item.ts)}
              </div>
            )}
            <div className="bg-card rounded-DEFAULT px-4 py-3.5 mb-2 flex items-center gap-3.5">
              <div className="text-[12px] text-ink-faint w-16 flex-none">{fmtTime(item.ts)}</div>
              <div className="flex-1 text-[14px] font-medium">{contextLabel(item.context)}</div>
              <div className={cn("text-[22px] font-bold font-num tracking-tight", stat === "over" ? "text-warn" : "text-good")}>
                {item.value}
              </div>
            </div>
          </div>
        );
      });
    }
    if (recType === "meal") {
      if (!meals.length) return <EmptyState />;
      let lastDay = "";
      return meals.map((item) => {
        const day = dayKey(item.ts);
        const showDivider = day !== lastDay;
        lastDay = day;
        const mtLabel = { breakfast: "아침", lunch: "점심", dinner: "저녁", snack: "간식" }[item.mealTime] || "식사";
        return (
          <div key={item.id}>
            {showDivider && (
              <div className="text-[11px] text-ink-faint tracking-widest uppercase mt-[18px] mb-2.5 px-1">
                {dayLabel(item.ts)}
              </div>
            )}
            <div className="bg-card rounded-DEFAULT px-4 py-3.5 mb-2 flex items-center gap-3.5">
              <div className="text-[12px] text-ink-faint w-16 flex-none">{fmtTime(item.ts)}</div>
              {item.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photo} alt="" className="w-14 h-14 rounded-[10px] object-cover flex-none" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium">
                  {mtLabel}{item.orderOk ? " · ✓ 순서" : ""}
                </div>
                {item.note && (
                  <div className="text-[12px] text-ink-soft mt-0.5 truncate">{item.note}</div>
                )}
              </div>
            </div>
          </div>
        );
      });
    }
    if (!exercises.length) return <EmptyState />;
    let lastDay = "";
    return exercises.map((item) => {
      const day = dayKey(item.ts);
      const showDivider = day !== lastDay;
      lastDay = day;
      return (
        <div key={item.id}>
          {showDivider && (
            <div className="text-[11px] text-ink-faint tracking-widest uppercase mt-[18px] mb-2.5 px-1">
              {dayLabel(item.ts)}
            </div>
          )}
          <div className="bg-card rounded-DEFAULT px-4 py-3.5 mb-2 flex items-center gap-3.5">
            <div className="text-[12px] text-ink-faint w-16 flex-none">{fmtTime(item.ts)}</div>
            <div className="flex-1 text-[14px] font-medium">산책 {item.duration}분</div>
          </div>
        </div>
      );
    });
  }

  return (
    <div className="min-h-dvh bg-bg">
      <ToastProvider />
      <div className="max-w-[480px] mx-auto px-[18px] pb-[120px]">
        <div className="flex items-center py-4">
          <h1 className="text-[20px] font-semibold tracking-tight">혈당 추세</h1>
        </div>

        {/* Period pills */}
        <div className="flex gap-1.5 mb-3.5 bg-bg-soft p-1 rounded-full">
          {([7, 14, 30] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 py-2.5 text-[13px] rounded-full text-center font-medium transition-colors",
                period === p
                  ? "bg-card text-ink shadow-sm"
                  : "text-ink-soft"
              )}
            >
              {p}일
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-card rounded-lg p-5 mb-3.5">
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: "200px", display: "block" }}
          />
          <div className="flex gap-3.5 mt-3.5 flex-wrap justify-center text-[11px] text-ink-soft tracking-[0.04em]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />공복
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gold" />식후 1시간
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-warn opacity-50" />목표선
            </div>
          </div>
        </div>

        {/* Record list */}
        <div className="bg-card rounded-lg p-5 mb-3.5">
          <div className="text-[13px] text-ink-soft font-medium mb-3">기록</div>
          <div className="flex gap-1.5 bg-bg-soft p-1 rounded-full">
            {(["glucose", "meal", "exercise"] as RecordType[]).map((rt) => (
              <button
                key={rt}
                onClick={() => setRecType(rt)}
                className={cn(
                  "flex-1 py-2.5 text-[13px] rounded-full text-center font-medium transition-colors",
                  recType === rt ? "bg-card text-ink shadow-sm" : "text-ink-soft"
                )}
              >
                {rt === "glucose" ? "혈당" : rt === "meal" ? "식사" : "산책"}
              </button>
            ))}
          </div>
        </div>

        <div>{renderList()}</div>
      </div>
      <BottomNav />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-ink-faint">
      <div className="text-[40px] mb-3.5 opacity-40">○</div>
      아직 기록이 없어요
    </div>
  );
}

function drawChart(
  canvas: HTMLCanvasElement,
  reads: { ts: string; value: number; context: GlucoseContext }[],
  period: number,
  targets: { fasting: number; pp1h: number; pp2h: number }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const sorted = [...reads].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  const pad = { l: 32, r: 12, t: 12, b: 22 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const yMin = 50;
  const yMax = 200;
  const yPos = (v: number) =>
    pad.t + plotH - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * plotH;
  const cutoff = daysAgo(period);
  const xStart = cutoff.getTime();
  const xEnd = Date.now();
  const xPos = (t: number) => pad.l + ((t - xStart) / (xEnd - xStart)) * plotW;

  // Grid
  ctx.strokeStyle = "#e0d9cc";
  ctx.lineWidth = 0.5;
  ctx.fillStyle = "#9d9a92";
  ctx.font = "10px Pretendard Variable, sans-serif";
  [60, 100, 140, 180].forEach((v) => {
    const y = yPos(v);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillText(String(v), 6, y + 3);
  });

  // Target lines
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "#b76e5f";
  ctx.globalAlpha = 0.45;
  [targets.fasting, targets.pp1h].forEach((v) => {
    const y = yPos(v);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // X labels
  const step = period <= 7 ? 1 : period <= 14 ? 2 : 5;
  for (let i = 0; i <= period; i += step) {
    const d = new Date();
    d.setDate(d.getDate() - period + i);
    d.setHours(12, 0, 0, 0);
    const x = xPos(d.getTime());
    ctx.fillStyle = "#9d9a92";
    ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, x - 10, h - 6);
  }

  const fastings = sorted.filter((r) => r.context === "fasting");
  const pp1hs = sorted.filter((r) => r.context.startsWith("pp1h"));

  // Lines
  const drawLine = (pts: typeof fastings, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((r, i) => {
      const x = xPos(new Date(r.ts).getTime());
      const y = yPos(r.value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  drawLine(fastings, "#5e7a6b");
  drawLine(pp1hs, "#b59563");

  // Dots
  fastings.forEach((r) => {
    const x = xPos(new Date(r.ts).getTime());
    const y = yPos(r.value);
    ctx.fillStyle = r.value >= targets.fasting ? "#b76e5f" : "#5e7a6b";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  pp1hs.forEach((r) => {
    const x = xPos(new Date(r.ts).getTime());
    const y = yPos(r.value);
    ctx.fillStyle = r.value >= targets.pp1h ? "#b76e5f" : "#b59563";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  if (!sorted.length) {
    ctx.fillStyle = "#9d9a92";
    ctx.font = "13px Pretendard Variable, sans-serif";
    ctx.fillText("아직 기록이 없어요", pad.l + plotW / 2 - 55, pad.t + plotH / 2);
  }
}
