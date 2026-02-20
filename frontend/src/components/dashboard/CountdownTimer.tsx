import { useState, useEffect } from "react";

interface CountdownTimerProps {
  deadline: string;
  compact?: boolean;
  completed?: boolean;
}

export function CountdownTimer({
  deadline,
  compact,
  completed,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (completed) {
    if (compact) {
      return (
        <span className="text-xs font-medium text-status-gentle">Done</span>
      );
    }
    return (
      <div className="text-center">
        <div className="font-bold text-2xl text-status-gentle">Done</div>
        <p className="text-[10px] text-muted mt-1">
          Next:{" "}
          {new Date(deadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    );
  }

  if (timeLeft.total <= 0 && !timeLeft.inGracePeriod) {
    return (
      <span
        className={`font-bold text-status-chaos ${compact ? "text-xs" : "text-xl"}`}
      >
        Expired
      </span>
    );
  }

  if (timeLeft.inGracePeriod) {
    if (compact) {
      return (
        <span className="text-xs font-medium text-status-firm">
          Grace: {timeLeft.minutes}m
        </span>
      );
    }
    return (
      <div className="font-bold text-2xl tabular-nums text-status-firm">
        Grace Period: {String(timeLeft.minutes).padStart(2, "0")}:
        {String(timeLeft.seconds).padStart(2, "0")}
      </div>
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
  const gracePeriod = 60 * 60 * 1000; // 1 hour

  if (diff <= -gracePeriod) {
    return {
      total: diff,
      hours: 0,
      minutes: 0,
      seconds: 0,
      inGracePeriod: false,
    };
  }

  if (diff <= 0) {
    const graceDiff = diff + gracePeriod;
    return {
      total: diff,
      hours: Math.floor(graceDiff / (1000 * 60 * 60)),
      minutes: Math.floor((graceDiff / (1000 * 60)) % 60),
      seconds: Math.floor((graceDiff / 1000) % 60),
      inGracePeriod: true,
    };
  }

  return {
    total: diff,
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    inGracePeriod: false,
  };
}
