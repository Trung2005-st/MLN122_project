"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Đồng bộ đồng hồ server — chỉ re-anchor khi đổi phase/vòng.
 */
export function useSyncedClock(
  serverTime: number,
  phaseStartedAt: number,
  phase: string,
  roundIndex: number
) {
  const offsetRef = useRef(0);
  const syncKeyRef = useRef("");
  const syncKey = `${phase}:${roundIndex}:${phaseStartedAt}`;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    offsetRef.current = serverTime - Date.now();
    syncKeyRef.current = syncKey;
    setNow(Date.now() + offsetRef.current);

    const t = setInterval(() => {
      setNow(Date.now() + offsetRef.current);
    }, 250);
    return () => clearInterval(t);
    // Chỉ re-sync khi đổi phase/vòng — không phụ thuộc serverTime mỗi poll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  return now;
}
