import { useEffect, useState } from "react";

/** Refresh time-sensitive actions without losing the mounted form. Server time
 * and authorization remain authoritative when the action is submitted. */
export function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
