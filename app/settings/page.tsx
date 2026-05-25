"use client";

import { useEffect, useRef, useState } from "react";
import { db, getSettings, updateSettings, type Settings } from "@/lib/db";
import { BottomNav } from "@/components/ui/BottomNav";
import { ToastProvider, toast } from "@/components/ui/Toast";
import { currentWeek } from "@/lib/utils";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [week, setWeek] = useState("");
  const [targetFasting, setTargetFasting] = useState("");
  const [targetPp1h, setTargetPp1h] = useState("");
  const [targetPp2h, setTargetPp2h] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setName(s.name);
      setWeek(String(currentWeek(s)));
      setTargetFasting(String(s.targetFasting));
      setTargetPp1h(String(s.targetPp1h));
      setTargetPp2h(String(s.targetPp2h));
    });
  }, []);

  async function handleSave() {
    if (!settings) return;
    const newWeek = parseInt(week, 10);
    const patch: Partial<Omit<Settings, "id">> = {
      name: name.trim() || settings.name,
      targetFasting: parseInt(targetFasting, 10) || 95,
      targetPp1h: parseInt(targetPp1h, 10) || 140,
      targetPp2h: parseInt(targetPp2h, 10) || 120,
    };
    if (newWeek >= 1 && newWeek <= 42) {
      patch.weekAtSetup = newWeek;
      patch.setupDate = new Date().toISOString();
    }
    await updateSettings(patch);
    toast("설정이 저장됐어요");
    getSettings().then(setSettings);
  }

  async function exportBackup() {
    const [glucose, meals, exercise] = await Promise.all([
      db.glucose.toArray(),
      db.meals.toArray(),
      db.exercise.toArray(),
    ]);
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
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("현재 데이터를 백업 파일로 덮어씌웁니다. 진행할까요?")) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.transaction("rw", [db.glucose, db.meals, db.exercise, db.settings], async () => {
        if (data.glucose) { await db.glucose.clear(); await db.glucose.bulkAdd(data.glucose); }
        if (data.meals) { await db.meals.clear(); await db.meals.bulkAdd(data.meals); }
        if (data.exercise) { await db.exercise.clear(); await db.exercise.bulkAdd(data.exercise); }
        if (data.settings) await db.settings.put({ ...data.settings, id: 1 });
      });
      toast("데이터를 복원했어요");
      getSettings().then((s) => {
        setSettings(s);
        setName(s.name);
        setWeek(String(currentWeek(s)));
        setTargetFasting(String(s.targetFasting));
        setTargetPp1h(String(s.targetPp1h));
        setTargetPp2h(String(s.targetPp2h));
      });
    } catch {
      toast("파일을 읽을 수 없어요");
    }
  }

  async function handleReset() {
    if (!confirm("정말 모든 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.")) return;
    if (!confirm("마지막 확인입니다. 정말 초기화할까요?")) return;
    await db.transaction("rw", [db.glucose, db.meals, db.exercise, db.settings], async () => {
      await db.glucose.clear();
      await db.meals.clear();
      await db.exercise.clear();
      await db.settings.clear();
    });
    toast("초기화됐어요");
    window.location.href = "/welcome";
  }

  if (!settings) return null;

  return (
    <div className="min-h-dvh bg-bg">
      <ToastProvider />
      <div className="max-w-[480px] mx-auto px-[18px] pb-[120px]">
        <div className="flex items-center py-4">
          <h1 className="text-[20px] font-semibold tracking-tight">설정</h1>
        </div>

        {/* Profile */}
        <div className="bg-card rounded-lg overflow-hidden mb-3.5">
          <SettingRow label="이름">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-bg-soft border border-line rounded-[8px] px-3 py-2 w-20 text-right font-num text-sm"
            />
          </SettingRow>
          <SettingRow label="임신 주수" sub="매주 자동 +1" last>
            <input
              type="number"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              min={1}
              max={42}
              className="bg-bg-soft border border-line rounded-[8px] px-3 py-2 w-20 text-right font-num text-sm"
            />
          </SettingRow>
        </div>

        {/* Targets */}
        <div className="bg-card rounded-lg overflow-hidden mb-3.5">
          <SettingRow label="공복 목표" sub="mg/dL 미만">
            <input
              type="number"
              value={targetFasting}
              onChange={(e) => setTargetFasting(e.target.value)}
              className="bg-bg-soft border border-line rounded-[8px] px-3 py-2 w-20 text-right font-num text-sm"
            />
          </SettingRow>
          <SettingRow label="식후 1시간 목표" sub="mg/dL 미만">
            <input
              type="number"
              value={targetPp1h}
              onChange={(e) => setTargetPp1h(e.target.value)}
              className="bg-bg-soft border border-line rounded-[8px] px-3 py-2 w-20 text-right font-num text-sm"
            />
          </SettingRow>
          <SettingRow label="식후 2시간 목표" sub="mg/dL 미만" last>
            <input
              type="number"
              value={targetPp2h}
              onChange={(e) => setTargetPp2h(e.target.value)}
              className="bg-bg-soft border border-line rounded-[8px] px-3 py-2 w-20 text-right font-num text-sm"
            />
          </SettingRow>
        </div>

        {/* Data */}
        <div className="bg-card rounded-lg overflow-hidden mb-3.5">
          <SettingRow label="데이터 내보내기" sub="JSON 파일 다운로드" onClick={exportBackup}>
            <span className="text-ink-soft">→</span>
          </SettingRow>
          <SettingRow
            label="데이터 가져오기"
            sub="기존 백업 복원"
            onClick={() => importRef.current?.click()}
          >
            <span className="text-ink-soft">→</span>
          </SettingRow>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <SettingRow label="전체 초기화" sub="모든 기록 삭제" labelClass="text-warn" onClick={handleReset} last>
            <span className="text-ink-soft">→</span>
          </SettingRow>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-accent text-bg py-[18px] rounded-DEFAULT text-[16px] font-semibold active:bg-accent-deep mt-2"
        >
          설정 저장
        </button>

        <div className="text-center text-[11px] text-ink-faint mt-8 tracking-[0.05em] leading-[1.7]">
          모든 데이터는 이 기기에만 저장됩니다.<br />
          v1.0 · For my wife
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function SettingRow({
  label,
  sub,
  children,
  onClick,
  labelClass,
  last,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  onClick?: () => void;
  labelClass?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-[18px] py-4 gap-3 ${
        !last ? "border-b border-line" : ""
      } ${onClick ? "cursor-pointer active:bg-bg-soft" : ""}`}
      onClick={onClick}
    >
      <div>
        <div className={`text-[14px] ${labelClass ?? ""}`}>{label}</div>
        {sub && <div className="text-[11px] text-ink-faint mt-0.5">{sub}</div>}
      </div>
      {children}
    </div>
  );
}
