"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, getSettings, updateSettings } from "@/lib/db";
import { toast, ToastProvider } from "@/components/ui/Toast";

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [week, setWeek] = useState("");

  async function handleStart() {
    if (!name.trim()) {
      toast("이름을 입력해주세요");
      return;
    }
    const w = parseInt(week, 10);
    if (!w || w < 1 || w > 42) {
      toast("임신 주수를 정확히 입력해주세요");
      return;
    }
    await getSettings();
    await updateSettings({
      name: name.trim(),
      weekAtSetup: w,
      setupDate: new Date().toISOString(),
      setupDone: true,
    });
    toast("환영합니다, " + name.trim() + "님");
    setTimeout(() => router.replace("/"), 300);
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col px-6 py-10 justify-between">
      <ToastProvider />
      <div className="mt-10">
        <div className="text-[11px] tracking-[0.2em] text-gold uppercase mb-[18px]">
          임신성 당뇨 관리
        </div>
        <h1 className="text-[36px] font-semibold tracking-[-0.03em] leading-[1.15] mb-[18px]">
          오늘부터<br />
          하루 네 번,<br />
          <em className="text-accent font-normal not-italic">천천히 함께</em>.
        </h1>
        <p className="text-[15px] text-ink-soft leading-[1.6]">
          혈당·식사·산책을 한 곳에 기록하고,<br />
          산부인과 방문 시 한 장의 리포트로 보여드리세요.
        </p>
      </div>

      <div className="mt-8">
        <div className="mb-[18px]">
          <div className="text-[12px] text-ink-soft tracking-[0.04em] uppercase font-medium mb-2">
            이름 (또는 호칭)
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 지영"
            className="w-full bg-card border border-line rounded-[12px] px-4 py-3.5 text-ink focus:outline-none focus:border-accent"
          />
        </div>
        <div className="mb-[18px]">
          <div className="text-[12px] text-ink-soft tracking-[0.04em] uppercase font-medium mb-2">
            현재 임신 주수
          </div>
          <input
            type="number"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            placeholder="예: 28"
            min={1}
            max={42}
            className="w-full bg-card border border-line rounded-[12px] px-4 py-3.5 text-ink focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={handleStart}
          className="w-full bg-accent text-bg py-[18px] rounded-DEFAULT text-[16px] font-semibold active:bg-accent-deep transition-colors"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
