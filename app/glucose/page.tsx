"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, type GlucoseContext, type Settings } from "@/lib/db";
import { addGlucose } from "@/lib/repository/glucose";
import { NumPad } from "@/components/ui/NumPad";
import { ToastProvider, toast } from "@/components/ui/Toast";
import { autoDetectContext, contextLabel, statusForReading, cn } from "@/lib/utils";

const CONTEXT_PILLS: { context: GlucoseContext; label: string; sub: string }[] = [
  { context: "fasting", label: "공복", sub: "FASTING" },
  { context: "pp1h_breakfast", label: "아침후", sub: "+1H" },
  { context: "pp1h_lunch", label: "점심후", sub: "+1H" },
  { context: "pp1h_dinner", label: "저녁후", sub: "+1H" },
];

export default function GlucosePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [value, setValue] = useState("");
  const [context, setContext] = useState<GlucoseContext | null>(null);
  const [overrideTime, setOverrideTime] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      const auto = autoDetectContext();
      if (auto) setContext(auto);
    });
  }, []);

  const targets = settings
    ? { fasting: settings.targetFasting, pp1h: settings.targetPp1h, pp2h: settings.targetPp2h }
    : { fasting: 95, pp1h: 140, pp2h: 120 };

  const numVal = parseInt(value, 10);
  const stat =
    value && context
      ? statusForReading(numVal, context, targets)
      : null;

  const canSave = value.length >= 2 && !!context;

  function handleKey(key: string) {
    if (key === "del") {
      setValue((v) => v.slice(0, -1));
    } else {
      setValue((v) => (v.length < 3 ? v + key : v));
    }
  }

  function handleTime() {
    const now = overrideTime ? new Date(overrideTime) : new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const input = window.prompt(
      "측정 시간을 입력하세요 (HH:MM)\n빈칸이면 지금 시간으로 저장됩니다.",
      hh + ":" + mm
    );
    if (input === null) return;
    if (!input.trim()) {
      setOverrideTime(null);
      toast("현재 시간으로 저장됩니다");
      return;
    }
    const m = input.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) { toast("형식이 맞지 않아요 (예: 08:30)"); return; }
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h > 23 || min > 59) { toast("시간 값이 올바르지 않아요"); return; }
    const d = new Date();
    d.setHours(h, min, 0, 0);
    if (d > new Date()) d.setDate(d.getDate() - 1);
    setOverrideTime(d.toISOString());
    toast("시간 설정: " + h + ":" + min.toString().padStart(2, "0"));
  }

  async function handleSave() {
    if (!canSave || !context) return;
    await addGlucose(numVal, context, overrideTime ?? undefined);
    toast("혈당 " + numVal + " mg/dL 저장됨");
    setTimeout(() => router.replace("/"), 400);
  }

  let targetForDisplay = targets.fasting;
  if (context?.startsWith("pp1h")) targetForDisplay = targets.pp1h;
  if (context?.startsWith("pp2h")) targetForDisplay = targets.pp2h;

  return (
    <div className="min-h-dvh bg-bg">
      <ToastProvider />
      <div className="max-w-[480px] mx-auto flex flex-col" style={{ minHeight: "100dvh" }}>

        {/* Top sticky area */}
        <div className="sticky top-0 bg-bg z-10 pt-safe-top">
          <div className="flex items-center px-[18px] py-2">
            <button
              className="text-[15px] text-ink-soft font-medium pr-3 py-2"
              onClick={() => router.replace("/")}
            >
              ← 뒤로
            </button>
          </div>

          {/* Value display */}
          <div className="text-center py-7 px-[18px]">
            <div
              className={cn(
                "text-[72px] font-bold tracking-[-0.04em] font-num leading-none",
                !value ? "text-ink-faint" : stat === "over" ? "text-warn" : stat === "good" ? "text-good" : "text-ink"
              )}
            >
              {value || "--"}
            </div>
            <div className="text-[13px] text-ink-faint tracking-widest uppercase mt-1.5">
              mg/dL
            </div>
            <div
              className={cn(
                "text-[13px] font-medium mt-3 min-h-[20px]",
                stat === "over" ? "text-warn" : stat === "good" ? "text-good" : "text-ink-faint"
              )}
            >
              {context && value
                ? `${contextLabel(context)} · 목표 < ${targetForDisplay}`
                : !context
                ? "시점을 선택하세요"
                : ""}
            </div>
          </div>

          {/* Context pills — always visible, above numpad */}
          <div className="grid grid-cols-4 gap-1.5 px-[18px] pb-[18px]">
            {CONTEXT_PILLS.map((p) => (
              <button
                key={p.context}
                onClick={() => setContext(p.context)}
                className={cn(
                  "py-3 px-1 rounded-[10px] border text-[11px] font-medium text-center leading-tight transition-colors",
                  context === p.context
                    ? "bg-accent text-bg border-accent"
                    : "bg-card border-line text-ink-soft"
                )}
              >
                {p.label}
                <span className="block text-[9px] mt-0.5 opacity-70 tracking-widest">
                  {p.sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Numpad */}
        <NumPad onKey={handleKey} onTime={handleTime} />

        {/* Save button */}
        <div className="px-[18px] pb-[18px] mt-auto">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "w-full py-[18px] rounded-DEFAULT text-[16px] font-semibold transition-colors",
              canSave
                ? "bg-accent text-bg active:bg-accent-deep"
                : "bg-accent/30 text-bg/50 cursor-not-allowed"
            )}
          >
            {!value && !context
              ? "시점과 값을 입력하세요"
              : !context
              ? "시점을 선택하세요"
              : !value
              ? "값을 입력하세요"
              : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
