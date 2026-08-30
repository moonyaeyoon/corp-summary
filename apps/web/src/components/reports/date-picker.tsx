"use client";

import { useMemo, useState } from "react";
import { Icon } from "./icon";

interface CalendarDay {
  date: Date;
  day: number;
  isoDate: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
}

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getCalendarDays(displayDate: Date, selectedDate: string): CalendarDay[] {
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDate.getDay());
  const today = toIsoDate(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const isoDate = toIsoDate(date);

    return {
      date,
      day: date.getDate(),
      isoDate,
      isCurrentMonth: date.getMonth() === month,
      isSelected: isoDate === selectedDate,
      isToday: isoDate === today,
    };
  });
}

function getInitialDisplayDate(value: string): Date {
  return value ? fromIsoDate(value) : new Date();
}

export function DatePicker({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [displayDate, setDisplayDate] = useState(() => getInitialDisplayDate(value));
  const days = useMemo(() => getCalendarDays(displayDate, value), [displayDate, value]);

  function moveMonth(amount: number) {
    setDisplayDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function selectDate(isoDate: string) {
    onChange(isoDate);
    setDisplayDate(fromIsoDate(isoDate));
  }

  return (
    <div className="pick-date" role="dialog">
      <div className="pick-date-header">
        <button className="month-button" onClick={() => moveMonth(-1)} title="이전 달" type="button">
          <Icon name="chevronLeft" size={24} />
        </button>
        <strong>{monthFormatter.format(displayDate)}</strong>
        <button className="month-button" onClick={() => moveMonth(1)} title="다음 달" type="button">
          <Icon name="chevronRight" size={24} />
        </button>
      </div>

      <div className="weekday-grid">
        {weekdays.map((weekday, index) => (
          <span key={`${weekday}-${index}`}>{weekday}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day) => (
          <button
            aria-current={day.isToday ? "date" : undefined}
            aria-pressed={day.isSelected}
            className={[
              "calendar-day",
              day.isCurrentMonth ? "" : "outside-month",
              day.isSelected ? "selected" : "",
              day.isToday && !day.isSelected ? "today" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={day.isoDate}
            onClick={() => selectDate(day.isoDate)}
            type="button"
          >
            {day.day}
          </button>
        ))}
      </div>
    </div>
  );
}
