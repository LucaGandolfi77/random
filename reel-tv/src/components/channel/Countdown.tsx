"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate: Date;
}

export function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      <span className="rounded bg-muted px-1.5 py-0.5">{String(timeLeft.hours).padStart(2, "0")}</span>
      <span>:</span>
      <span className="rounded bg-muted px-1.5 py-0.5">{String(timeLeft.minutes).padStart(2, "0")}</span>
      <span>:</span>
      <span className="rounded bg-muted px-1.5 py-0.5">{String(timeLeft.seconds).padStart(2, "0")}</span>
    </div>
  );
}
