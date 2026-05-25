"use client";

import { useEffect } from "react";
import { migrateV0ToV1 } from "@/lib/migration/v0-to-v1";

/**
 * Runs the v0→v1 localStorage migration once on first app load.
 * Renders nothing — side-effect only.
 */
export function MigrationRunner() {
  useEffect(() => {
    migrateV0ToV1().catch(() => {
      // Migration failure is non-fatal; user can still use the app fresh.
    });
  }, []);

  return null;
}
