"use client";

import { useMemo, useState } from "react";

export type TimetableSchedule = {
  id: string;
  batchId: string;
  teacherId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId?: string | null;
  room?: string | null;
  createdAt?: string;
  batch?: {
    id: string;
    name: string;
  } | null;
  teacher?: {
    id: string;
    name: string;
    specialization?: string | null;
  } | null;
  subject?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
};

export type WeeklyTimetableProps = {
  schedules: TimetableSchedule[];
  onAddSchedule?: () => void;
  onEditSchedule?: (schedule: TimetableSchedule) => void;
  onDeleteSchedule?: (schedule: TimetableSchedule) => void;
  showBatchName?: boolean;
  showTeacherName?: boolean;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  readOnly?: boolean;
};

const DAY_DEFINITIONS = [
  { dayOfWeek: 1, short: "Mon", full: "Monday" },
  { dayOfWeek: 2, short: "Tue", full: "Tuesday" },
  { dayOfWeek: 3, short: "Wed", full: "Wednesday" },
  { dayOfWeek: 4, short: "Thu", full: "Thursday" },
  { dayOfWeek: 5, short: "Fri", full: "Friday" },
  { dayOfWeek: 6, short: "Sat", full: "Saturday" },
  { dayOfWeek: 0, short: "Sun", full: "Sunday" },
];

function formatTime(value?: string | null): string {
  if (!value) return "—";
  const parts = value.split(":");
  if (parts.length < 2) return value;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

// Color palette for subjects to give visual clarity to the schedule
const SUBJECT_COLORS = [
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", badge: "bg-orange-100 text-orange-800" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", badge: "bg-amber-100 text-amber-800" },
  { bg: "bg-stone-50", border: "border-stone-200", text: "text-stone-900", badge: "bg-stone-200 text-stone-800" },
  { bg: "bg-warm-50", border: "border-orange-200/80", text: "text-stone-900", badge: "bg-orange-100/70 text-orange-900" },
  { bg: "bg-yellow-50/60", border: "border-yellow-200", text: "text-yellow-950", badge: "bg-yellow-100 text-yellow-900" },
];

function getSubjectColor(subjectName?: string) {
  if (!subjectName) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = (hash + subjectName.charCodeAt(i)) % SUBJECT_COLORS.length;
  }
  return SUBJECT_COLORS[hash];
}

export default function WeeklyTimetable({
  schedules,
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule,
  showBatchName = false,
  showTeacherName = true,
  title,
  subtitle,
  emptyMessage,
  readOnly = false,
}: WeeklyTimetableProps) {
  const hasSaturday = useMemo(() => {
    return schedules.some((s) => s.dayOfWeek === 6);
  }, [schedules]);

  const hasSunday = useMemo(() => {
    return schedules.some((s) => s.dayOfWeek === 0);
  }, [schedules]);

  // Active days to display: Monday–Saturday standard, Sunday only if scheduled
  const activeDays = useMemo(() => {
    const days = DAY_DEFINITIONS.filter((d) => {
      if (d.dayOfWeek >= 1 && d.dayOfWeek <= 6) return true; // Mon-Sat always
      if (d.dayOfWeek === 0) return hasSunday; // Sunday only if scheduled
      return false;
    });
    return days;
  }, [hasSunday]);

  // Selected day for mobile tab view
  const [mobileActiveDay, setMobileActiveDay] = useState<number>(1);

  // Group schedules by dayOfWeek and sort by startTime
  const schedulesByDay = useMemo(() => {
    const map = new Map<number, TimetableSchedule[]>();
    for (const day of DAY_DEFINITIONS) {
      map.set(day.dayOfWeek, []);
    }
    for (const schedule of schedules) {
      const list = map.get(schedule.dayOfWeek);
      if (list) {
        list.push(schedule);
      }
    }
    // Sort each day's schedules by startTime ascending
    for (const [day, list] of map.entries()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [schedules]);

  const totalClasses = schedules.length;

  return (
    <div className="w-full">
      {/* Timetable Overview Bar */}
      {title && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight text-stone-900 sm:text-lg">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 border border-orange-100">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {totalClasses} {totalClasses === 1 ? "class" : "classes"} / week
            </span>

            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
              {hasSaturday ? "Mon – Sat" : "Mon – Fri"}
            </span>
          </div>
        </div>
      )}

      {/* Mobile Day Selector (Visible on mobile screens) */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 sm:hidden">
        {activeDays.map((d) => {
          const count = schedulesByDay.get(d.dayOfWeek)?.length || 0;
          const isActive = mobileActiveDay === d.dayOfWeek;
          return (
            <button
              key={d.dayOfWeek}
              type="button"
              onClick={() => setMobileActiveDay(d.dayOfWeek)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span>{d.short}</span>
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/30 text-white"
                    : count > 0
                      ? "bg-orange-100 text-orange-700"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Single Day Card View */}
      <div className="block sm:hidden">
        {totalClasses === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-500">
              📅
            </div>
            <p className="mt-3 text-sm font-bold text-stone-900">
              {emptyMessage || "No classes scheduled yet"}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-stone-400">
              Create your first timetable entry to set up recurring weekly periods.
            </p>
            {!readOnly && onAddSchedule && (
              <button
                type="button"
                onClick={onAddSchedule}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-600 active:scale-95"
              >
                <span>+</span>
                <span>Add Class</span>
              </button>
            )}
          </div>
        ) : (
          (() => {
            const dayDef = DAY_DEFINITIONS.find((d) => d.dayOfWeek === mobileActiveDay);
            const dayClasses = schedulesByDay.get(mobileActiveDay) || [];

            return (
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2">
                  <h4 className="text-sm font-bold text-stone-900">
                    {dayDef?.full}
                  </h4>
                  <span className="text-xs text-stone-400">
                    {dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"}
                  </span>
                </div>

                {dayClasses.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400">
                    No classes scheduled for {dayDef?.full}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dayClasses.map((item) => {
                      const color = getSubjectColor(item.subject?.name);
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border ${color.border} ${color.bg} p-3 transition`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${color.badge}`}
                              >
                                {item.subject?.name || "Subject not set"}
                              </span>
                              <p className="mt-1 text-xs font-semibold text-stone-800">
                                {formatTimeRange(item.startTime, item.endTime)}
                              </p>
                            </div>

                            {!readOnly && (
                              <div className="flex items-center gap-1">
                                {onEditSchedule && (
                                  <button
                                    type="button"
                                    onClick={() => onEditSchedule(item)}
                                    className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
                                  >
                                    Edit
                                  </button>
                                )}
                                {onDeleteSchedule && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteSchedule(item)}
                                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                            {showTeacherName && item.teacher && (
                              <span className="inline-flex items-center gap-1 font-medium">
                                <span className="text-stone-400">👤</span>
                                {item.teacher.name}
                              </span>
                            )}
                            {showBatchName && item.batch && (
                              <span className="inline-flex items-center gap-1 font-medium text-orange-700">
                                <span className="text-stone-400">◈</span>
                                {item.batch.name}
                              </span>
                            )}
                            {item.room && (
                              <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-stone-500">
                                Room: {item.room}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Desktop Weekly Schedule View */}
      <div className="hidden sm:block">
        {totalClasses === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200/90 bg-white p-12 text-center shadow-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500 ring-4 ring-orange-50/50">
              📅
            </div>
            <h4 className="mt-4 text-base font-bold text-stone-900">
              {emptyMessage || "No classes scheduled yet"}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-400">
              Create your first timetable entry to set up recurring weekly periods for this cohort.
            </p>
            {!readOnly && onAddSchedule && (
              <button
                type="button"
                onClick={onAddSchedule}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-95"
              >
                <span className="text-sm font-bold leading-none">+</span>
                <span>Add Class</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
            <div
              className="grid divide-x divide-stone-200/80 bg-white"
              style={{
                gridTemplateColumns: `repeat(${activeDays.length}, minmax(0, 1fr))`,
              }}
            >
              {activeDays.map((day) => {
                const dayClasses = schedulesByDay.get(day.dayOfWeek) || [];

                return (
                  <div key={day.dayOfWeek} className="flex flex-col min-w-0">
                    {/* Modern Day Column Header */}
                    <div className="border-b border-stone-200/80 bg-stone-50/70 px-3.5 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          {day.full}
                        </span>
                        <span
                          className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                            dayClasses.length > 0
                              ? "bg-orange-100 text-orange-700"
                              : "bg-stone-200/70 text-stone-500"
                          }`}
                        >
                          {dayClasses.length}
                        </span>
                      </div>
                    </div>

                    {/* Day Schedule Column Body */}
                    <div className="flex-1 space-y-2.5 p-3 min-h-[340px] bg-[#faf8f5]/40 transition-colors">
                      {dayClasses.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200/60 p-3 text-center">
                          <span className="text-[11px] font-medium text-stone-400">
                            No classes
                          </span>
                          {!readOnly && onAddSchedule && (
                            <button
                              type="button"
                              onClick={onAddSchedule}
                              className="mt-1.5 text-[10px] font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                            >
                              + Schedule
                            </button>
                          )}
                        </div>
                      ) : (
                        dayClasses.map((item) => {
                          const color = getSubjectColor(item.subject?.name);

                          return (
                            <div
                              key={item.id}
                              className={`group relative rounded-xl border ${color.border} ${color.bg} p-2.5 shadow-xs transition duration-150 hover:-translate-y-0.5 hover:shadow-md`}
                            >
                              {/* Time Header */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold text-stone-900">
                                  {formatTimeRange(item.startTime, item.endTime)}
                                </span>

                                {!readOnly && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    {onEditSchedule && (
                                      <button
                                        type="button"
                                        onClick={() => onEditSchedule(item)}
                                        title="Edit class"
                                        className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 shadow-xs hover:bg-stone-50 hover:text-orange-600 transition"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {onDeleteSchedule && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteSchedule(item)}
                                        title="Delete class"
                                        className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Subject Badge */}
                              <div className="mt-1.5">
                                <span
                                  className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold leading-tight ${color.badge}`}
                                  title={item.subject?.name || "Subject"}
                                >
                                  {item.subject?.name || "Subject not set"}
                                </span>
                              </div>

                              {/* Cohort Name */}
                              {showBatchName && item.batch && (
                                <p
                                  className="mt-1 text-[11px] font-medium text-orange-700 truncate"
                                  title={item.batch.name}
                                >
                                  {item.batch.name}
                                </p>
                              )}

                              {/* Teacher Info */}
                              {showTeacherName && item.teacher && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-600 truncate">
                                  <span className="text-stone-400">👤</span>
                                  <span className="truncate" title={item.teacher.name}>
                                    {item.teacher.name}
                                  </span>
                                </div>
                              )}

                              {/* Room Info */}
                              {item.room && (
                                <div className="mt-1">
                                  <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                                    Room: {item.room}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
