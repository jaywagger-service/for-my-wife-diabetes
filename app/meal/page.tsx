"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMeal, mealTimeLabel } from "@/lib/repository/meals";
import { ToastProvider, toast } from "@/components/ui/Toast";
import { autoDetectMealTime, resizeImage, cn } from "@/lib/utils";
import type { MealTime } from "@/lib/db";

const MEAL_TIMES: MealTime[] = ["breakfast", "lunch", "dinner", "snack"];

export default function MealPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [mealTime, setMealTime] = useState<MealTime>(autoDetectMealTime);
  const [orderOk, setOrderOk] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await resizeImage(file);
      setPhoto(url);
    } catch {
      toast("사진을 불러올 수 없어요");
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await addMeal({ photo, mealTime, orderOk, note: note.trim() });
      toast("식사가 저장됐어요. 1시간 후 혈당 측정 기억해주세요.");
      setTimeout(() => router.replace("/"), 600);
    } catch {
      toast("저장에 실패했어요");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <ToastProvider />
      <div className="max-w-[480px] mx-auto px-[18px] pb-[40px]">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <button
            className="text-[15px] text-ink-soft font-medium py-2 pr-3"
            onClick={() => router.replace("/")}
          >
            ← 뒤로
          </button>
          <h1 className="text-[20px] font-semibold tracking-tight">식사 기록</h1>
          <div className="w-16" />
        </div>

        {/* Photo zone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />
        <div
          className="relative bg-card border border-dashed border-line rounded-lg mb-3.5 overflow-hidden cursor-pointer"
          style={{ aspectRatio: "4/3" }}
          onClick={() => fileRef.current?.click()}
        >
          {photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-2.5 right-2.5 bg-black/55 text-white px-3 py-1.5 rounded-full text-[11px] tracking-widest">
                다시 선택
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-faint">
              <div className="text-[40px] mb-2 opacity-50">⊞</div>
              <div className="text-[13px] tracking-widest">사진 촬영 또는 선택</div>
            </div>
          )}
        </div>

        {/* Meal time */}
        <div className="mb-3.5">
          <div className="text-[12px] text-ink-soft tracking-[0.04em] uppercase font-medium mb-2">
            식사 시간
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_TIMES.map((mt) => (
              <button
                key={mt}
                onClick={() => setMealTime(mt)}
                className={cn(
                  "py-3 rounded-[10px] border text-[11px] font-medium text-center transition-colors",
                  mealTime === mt
                    ? "bg-accent text-bg border-accent"
                    : "bg-card border-line text-ink-soft"
                )}
              >
                {mealTimeLabel(mt)}
              </button>
            ))}
          </div>
        </div>

        {/* Order toggle */}
        <div
          className="flex bg-card border border-line rounded-[12px] px-4 py-3.5 items-center justify-between mb-3.5 gap-3 cursor-pointer"
          onClick={() => setOrderOk((v) => !v)}
        >
          <div>
            <div className="text-[14px] font-medium">식사 순서 지켰어요</div>
            <div className="text-[11px] text-ink-faint mt-0.5">
              채소 → 단백질 → 탄수화물
            </div>
          </div>
          <div
            className={cn(
              "w-[50px] h-[28px] rounded-full relative transition-colors flex-none",
              orderOk ? "bg-accent" : "bg-bg-soft"
            )}
          >
            <div
              className={cn(
                "absolute w-[22px] h-[22px] bg-white rounded-full top-[3px] shadow transition-all",
                orderOk ? "left-[25px]" : "left-[3px]"
              )}
            />
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <div className="text-[12px] text-ink-soft tracking-[0.04em] uppercase font-medium mb-2">
            메모 (선택)
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="잡곡밥 반공기, 닭가슴살 100g, 샐러드…"
            className="w-full bg-card border border-line rounded-[12px] px-4 py-3.5 text-ink focus:outline-none focus:border-accent resize-none min-h-[60px] font-sans"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-accent text-bg py-[18px] rounded-DEFAULT text-[16px] font-semibold active:bg-accent-deep transition-colors disabled:opacity-40"
        >
          저장
        </button>
      </div>
    </div>
  );
}
