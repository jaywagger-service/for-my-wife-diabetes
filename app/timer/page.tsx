"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addExercise } from "@/lib/repository/exercise";
import { ToastProvider, toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const PRESETS = [10, 15, 20];
const CIRC = 2 * Math.PI * 46;

export default function TimerPage() {
  const router = useRouter();
  const [preset, setPreset] = useState(15);
  const [remaining, setRemaining] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(15 * 60);

  function selectPreset(min: number) {
    if (running) return;
    setPreset(min);
    setRemaining(min * 60);
    durationRef.current = min * 60;
    setDone(false);
  }

  function toggleTimer() {
    if (done) {
      resetTimer();
      return;
    }
    if (running) {
      clearInterval(intervalRef.current!);
      setRunning(false);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            completeTimer();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
  }

  function resetTimer() {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setDone(false);
    setRemaining(durationRef.current);
  }

  async function completeTimer() {
    await addExercise(Math.floor(durationRef.current / 60));
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {}
    toast(Math.floor(durationRef.current / 60) + "분 산책 완료! 잘하셨어요");
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const progress = (durationRef.current - remaining) / durationRef.current;
  const dashOffset = CIRC * (1 - progress);

  const statusLabel = done
    ? "완료!"
    : running
    ? "걷는 중"
    : remaining < durationRef.current
    ? "일시정지"
    : "준비됨";

  return (
    <div className="min-h-dvh bg-bg">
      <ToastProvider />
      <div className="max-w-[480px] mx-auto px-[18px] pb-10">
        <div className="flex items-center justify-between py-4">
          <button
            className="text-[15px] text-ink-soft font-medium py-2 pr-3"
            onClick={() => router.replace("/")}
          >
            ← 뒤로
          </button>
          <h1 className="text-[20px] font-semibold tracking-tight">식후 산책</h1>
          <div className="w-16" />
        </div>

        {/* Timer circle */}
        <div className="w-[240px] h-[240px] mx-auto mt-8 mb-6 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              className="fill-none stroke-bg-soft"
              cx="50"
              cy="50"
              r="46"
              strokeWidth="8"
            />
            <circle
              className="fill-none stroke-accent"
              cx="50"
              cy="50"
              r="46"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: running ? "stroke-dashoffset 1s linear" : "none" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[56px] font-bold tracking-[-0.03em] font-num leading-none">
              {mm}:{ss}
            </div>
            <div className="text-[12px] text-ink-faint mt-1.5 tracking-widest uppercase">
              {statusLabel}
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {PRESETS.map((min) => (
            <button
              key={min}
              onClick={() => selectPreset(min)}
              className={cn(
                "bg-card border border-line rounded-[12px] py-3.5 text-[14px] font-medium transition-colors",
                preset === min && !running
                  ? "bg-accent text-bg border-accent"
                  : "text-ink"
              )}
            >
              {min}분
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={toggleTimer}
            className="flex-1 bg-accent text-bg py-[18px] rounded-DEFAULT text-[16px] font-semibold active:bg-accent-deep transition-colors"
          >
            {done ? "다시 시작" : running ? "일시정지" : "시작"}
          </button>
          <button
            onClick={resetTimer}
            className="flex-1 bg-card border border-line text-ink py-[18px] rounded-DEFAULT text-[16px] font-semibold"
          >
            초기화
          </button>
        </div>

        <div className="mt-[18px] text-center text-[12px] text-ink-faint leading-[1.5]">
          식후 30분 이내 걸으면<br />
          식후 혈당 상승을 가장 잘 누릅니다.
        </div>
      </div>
    </div>
  );
}
