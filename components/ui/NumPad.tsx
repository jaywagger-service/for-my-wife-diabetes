"use client";

import { cn } from "@/lib/utils";

interface NumPadProps {
  onKey: (key: string) => void;
  onTime?: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "time", "0", "del"];

export function NumPad({ onKey, onTime }: NumPadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 px-3 pb-4">
      {KEYS.map((key) => (
        <button
          key={key}
          onClick={() => {
            if (key === "time") onTime?.();
            else onKey(key);
          }}
          className={cn(
            "h-[60px] rounded-[14px] border border-line text-ink transition-colors",
            "active:bg-bg-soft font-sans",
            key === "del"
              ? "bg-card text-warn text-lg font-medium"
              : key === "time"
              ? "bg-bg-soft text-[15px] font-medium"
              : "bg-card text-[28px] font-medium"
          )}
        >
          {key === "del" ? "←" : key === "time" ? "⏱ 시간" : key}
        </button>
      ))}
    </div>
  );
}
