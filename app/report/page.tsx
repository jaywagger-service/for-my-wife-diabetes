"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, type Settings } from "@/lib/db";
import { BottomNav } from "@/components/ui/BottomNav";
import { ToastProvider, toast } from "@/components/ui/Toast";
import { daysAgo, dayKey, currentWeek, statusForReading, cn } from "@/lib/utils";

type Period = 7 | 14 | 30;

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>(7);
  const [settings, setSettings] = useState<Settings | null>(null);

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

  if (!settings) return null;

  const targets = {
    fasting: settings.targetFasting,
    pp1h: settings.targetPp1h,
    pp2h: settings.targetPp2h,
  };

  const reads = glucoseRecords ?? [];
  const fastings = reads.filter((r) => r.context === "fasting");
  const pp1hs = reads.filter((r) => r.context.startsWith("pp1h"));
  const pp2hs = reads.filter((r) => r.context.startsWith("pp2h"));

  function calcStats(arr: { value: number }[], target: number) {
    if (!arr.length) return { avg: "--", min: "--", max: "--", n: 0, overRate: 0, isOver: false };
    const vals = arr.map((r) => r.value);
    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const overN = vals.filter((v) => v >= target).length;
    const overRate = Math.round((overN / vals.length) * 100);
    return { avg, min, max, n: vals.length, overRate, isOver: overRate >= 30 };
  }

  const fStat = calcStats(fastings, targets.fasting);
  const ppStat = calcStats(pp1hs, targets.pp1h);
  const pp2Stat = calcStats(pp2hs, targets.pp2h);

  const meals = mealRecords ?? [];
  const orderOkRate = meals.length
    ? Math.round((meals.filter((m) => m.orderOk).length / meals.length) * 100)
    : 0;

  const exercises = exerciseRecords ?? [];
  const exerciseDays = new Set(exercises.map((e) => dayKey(e.ts))).size;
  const totalMin = exercises.reduce((s, e) => s + e.duration, 0);

  const insulinAdvice =
    (fStat.overRate >= 50 || ppStat.overRate >= 50)
      ? { level: "high", msg: "목표 초과율 50% 이상 — 인슐린 도입 상담 강력 권고" }
      : ((fStat.overRate + ppStat.overRate) / 2 >= 30)
      ? { level: "moderate", msg: "식사·운동 강화 필요 — 다음 진료 시 약물 도입 논의 권장" }
      : { level: "low", msg: "현재 식이·운동 관리 유지 권장" };

  const adviceBg =
    insulinAdvice.level === "high"
      ? "var(--warn-bg, #f4e3df)"
      : insulinAdvice.level === "moderate"
      ? "#f4ede1"
      : "var(--good-bg, #e3ecde)";

  function exportBackup() {
    Promise.all([
      db.glucose.toArray(),
      db.meals.toArray(),
      db.exercise.toArray(),
    ]).then(([glucose, meals, exercise]) => {
      const data = { settings, glucose, meals, exercise };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("백업 파일이 다운로드됐어요");
    });
  }

  return (
    <div className="min-h-dvh bg-bg">
      <ToastProvider />
      <div className="max-w-[480px] mx-auto px-[18px] pb-[120px]">
        <div className="flex items-center py-4">
          <h1 className="text-[20px] font-semibold tracking-tight">리포트</h1>
        </div>

        {/* Period */}
        <div className="flex gap-2 mb-3.5 no-print">
          {([7, 14, 30] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 py-3.5 rounded-[12px] text-[13px] font-medium transition-colors",
                period === p
                  ? "bg-accent text-bg"
                  : "bg-card border border-line text-ink"
              )}
            >
              {p}일
            </button>
          ))}
        </div>

        {/* Patient info */}
        <div className="bg-card rounded-lg p-[22px_20px] mb-3.5">
          <h2 className="text-[16px] font-semibold tracking-tight mb-3.5">
            {settings.name || "환자"} 님 · 임신 {currentWeek(settings)}주차
          </h2>
          <Row label="리포트 기간" val={`최근 ${period}일`} />
          <Row label="생성일" val={new Date().toLocaleDateString("ko-KR")} />
          <Row label="총 측정 횟수" val={`${reads.length}회`} last />
        </div>

        {/* Blood glucose summary */}
        <div className="bg-card rounded-lg p-[22px_20px] mb-3.5">
          <h2 className="text-[16px] font-semibold tracking-tight mb-3.5">혈당 요약</h2>
          <Row
            label={`공복 (목표 < ${targets.fasting})`}
            val={`${fStat.avg}`}
            valClass={fStat.isOver ? "text-warn" : "text-good"}
            sub={fStat.n ? `${fStat.n}회` : undefined}
          />
          <Row label="└ 범위" val={fStat.n ? `${fStat.min} ~ ${fStat.max}` : "--"} small />
          <Row
            label="└ 목표 초과율"
            val={fStat.n ? `${fStat.overRate}%` : "--"}
            valClass={fStat.isOver ? "text-warn" : "text-good"}
          />
          <Row
            label={`식후 1시간 (목표 < ${targets.pp1h})`}
            val={`${ppStat.avg}`}
            valClass={ppStat.isOver ? "text-warn" : "text-good"}
            sub={ppStat.n ? `${ppStat.n}회` : undefined}
          />
          <Row label="└ 범위" val={ppStat.n ? `${ppStat.min} ~ ${ppStat.max}` : "--"} small />
          <Row
            label="└ 목표 초과율"
            val={ppStat.n ? `${ppStat.overRate}%` : "--"}
            valClass={ppStat.isOver ? "text-warn" : "text-good"}
            last={!pp2Stat.n}
          />
          {pp2Stat.n > 0 && (
            <Row
              label={`식후 2시간 (목표 < ${targets.pp2h})`}
              val={`${pp2Stat.avg}`}
              valClass={pp2Stat.isOver ? "text-warn" : "text-good"}
              sub={`${pp2Stat.n}회`}
              last
            />
          )}
        </div>

        {/* Lifestyle */}
        <div className="bg-card rounded-lg p-[22px_20px] mb-3.5">
          <h2 className="text-[16px] font-semibold tracking-tight mb-3.5">생활습관 요약</h2>
          <Row label="식사 기록" val={`${meals.length}회`} />
          <Row label="식사 순서 준수율" val={`${orderOkRate}%`} />
          <Row label="산책 일수" val={`${exerciseDays}일`} />
          <Row label="총 산책 시간" val={`${totalMin}분`} last />
        </div>

        {/* Clinical advice */}
        <div className="rounded-lg p-[22px_20px] mb-3.5" style={{ background: adviceBg }}>
          <h2 className="text-[16px] font-semibold tracking-tight mb-3.5">임상 권고 (참고용)</h2>
          <div className="text-[14px] leading-[1.6]">{insulinAdvice.msg}</div>
          <div className="text-[11px] text-ink-faint mt-2.5 leading-[1.5]">
            ADA 2025 기준: 공복 &lt; 95, 식후 1h &lt; 140, 식후 2h &lt; 120 mg/dL.<br />
            최종 약물 결정은 산부인과 진료를 통해 이루어집니다.
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-accent text-bg py-3.5 rounded-[12px] text-[13px] font-medium"
          >
            인쇄/PDF
          </button>
          <button
            onClick={exportBackup}
            className="flex-1 bg-card border border-line text-ink py-3.5 rounded-[12px] text-[13px] font-medium"
          >
            백업 내보내기
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function Row({
  label,
  val,
  valClass,
  sub,
  small,
  last,
}: {
  label: string;
  val: string;
  valClass?: string;
  sub?: string;
  small?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-baseline py-2.5",
        !last ? "border-b border-line" : ""
      )}
    >
      <div className="text-[13px] text-ink-soft">{label}</div>
      <div className={cn("flex items-baseline gap-1", small ? "text-[14px] text-ink-soft" : "text-[17px] font-semibold font-num", valClass)}>
        {val}
        {sub && <span className="text-[11px] text-ink-faint font-normal">({sub})</span>}
      </div>
    </div>
  );
}
