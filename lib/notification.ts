/**
 * Notification helpers for meal post-measurement reminders.
 *
 * Strategy: schedule via setTimeout + Notification API.
 * The notification fires if the PWA tab remains open/active.
 * iOS < 16.4 and non-installed iOS PWA have additional constraints
 * that are surfaced as UI messages rather than silent failures.
 */

export type NotificationSupport =
  | "granted"        // permission already granted, ready to schedule
  | "default"        // not yet asked
  | "denied"         // user blocked; must go to OS settings
  | "unsupported"    // browser doesn't support Notification API
  | "ios-not-installed"; // iOS Safari, but not added to home screen (no push)

/** Detect iOS standalone (added to home screen) */
function isIOSStandalone(): boolean {
  return (
    typeof window !== "undefined" &&
    ("standalone" in navigator) &&
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /iP(hone|od|ad)/.test(navigator.userAgent)
  );
}

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) {
    // On iOS Safari < 16.4, Notification doesn't exist.
    // Show a helpful UI note instead.
    if (isIOS() && !isIOSStandalone()) return "ios-not-installed";
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "granted";
  return "default";
}

export function notificationStatusLabel(support: NotificationSupport): string {
  switch (support) {
    case "granted":
      return "앱을 열어두면 1시간 후 알려드려요";
    case "default":
      return "켜면 허용 팝업이 표시됩니다";
    case "denied":
      return "알림 권한이 차단됐어요 · 기기 설정에서 허용해주세요";
    case "ios-not-installed":
      return "홈 화면에 추가해야 iOS에서 알림을 받을 수 있어요";
    case "unsupported":
      return "이 브라우저는 알림을 지원하지 않아요";
  }
}

/**
 * Requests notification permission if not yet granted.
 * Returns the updated support state.
 */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  if (result === "granted") return "granted";
  if (result === "denied") return "denied";
  return "default";
}

/**
 * Schedules a local notification to fire 1 hour after calling this function.
 * The notification fires only while the page/PWA remains loaded.
 * Returns a cancel function.
 */
export function schedulePostMealReminder(mealLabel: string): () => void {
  const ONE_HOUR = 60 * 60 * 1000;

  const timerId = setTimeout(() => {
    try {
      new Notification("혈당 측정 시간이에요", {
        body: `${mealLabel} 후 1시간 됐어요. 혈당을 측정해보세요.`,
        icon: "/icon-192.svg",
        tag: "post-meal-reminder",
      });
    } catch {
      // Notification constructor can throw in some environments
    }
  }, ONE_HOUR);

  return () => clearTimeout(timerId);
}
