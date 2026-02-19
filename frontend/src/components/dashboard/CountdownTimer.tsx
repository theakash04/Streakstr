import { useState, useEffect } from "react";

interface CountdownTimerProps {
  deadline: string;
  compact?: boolean;
}

export function CountdownTimer({ deadline, compact }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (timeLeft.total <= 0) {
    return (
      <span
        className={`font-bold text-status-chaos ${compact ? "text-xs" : "text-xl"}`}
      >
        Expired
      </span>
    );
  }

  const urgency =
    timeLeft.hours < 2
      ? "text-status-chaos"
      : timeLeft.hours < 6
        ? "text-status-firm"
        : "text-foreground";

  if (compact) {
    return (
      <span className={`text-xs font-medium ${urgency}`}>
        {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    );
  }

  return (
    <div className={`font-bold text-2xl tabular-nums ${urgency}`}>
      {String(timeLeft.hours).padStart(2, "0")}:
      {String(timeLeft.minutes).padStart(2, "0")}:
      {String(timeLeft.seconds).padStart(2, "0")}
    </div>
  );
}

function calcTimeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    total: diff,
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}
