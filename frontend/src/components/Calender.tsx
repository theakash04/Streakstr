import React from "react";

interface CalendarProps {
  history: number[];
}

export const Calendar: React.FC<CalendarProps> = ({ history }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const historySet = new Set(
    history.map((ts) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );

  const days = [];

  // Padding for start of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`pad-${i}`} className="h-8 w-8" />);
  }

  // Days rendering
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const dateKey = `${currentYear}-${currentMonth}-${d}`;
    const isActive = historySet.has(dateKey);
    const isToday = d === today.getDate();
    const isFuture = date > today;

    let cellClass =
      "h-9 w-full flex items-center justify-center rounded-md text-sm font-medium transition-all relative ";

    if (isActive) {
      cellClass += "bg-primary text-primary-fg shadow-sm";
    } else if (isToday) {
      cellClass += "border-2 border-primary text-primary font-bold";
    } else if (isFuture) {
      cellClass += "text-text-muted opacity-30 cursor-default";
    } else {
      cellClass += "text-text-secondary bg-surface-muted/50";
    }

    days.push(
      <div key={d} className={cellClass} title={date.toDateString()}>
        {d}
        {isActive && (
          <span className="absolute bottom-1 w-1 h-1 bg-white/50 rounded-full"></span>
        )}
      </div>,
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold text-text-primary capitalize">
          {today.toLocaleString("default", { month: "long", year: "numeric" })}
        </span>
        <div className="flex gap-1">
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <span className="w-2 h-2 rounded-full bg-primary"></span> Done
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="text-[10px] font-bold text-text-muted uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 justify-items-center">{days}</div>
    </div>
  );
};
