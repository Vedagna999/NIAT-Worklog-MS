import React from 'react';
import { format, parseISO, startOfMonth, getDay } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';
import { MonthlyCalendarDay } from '../types';

interface MonthlyCalendarProps {
  days: MonthlyCalendarDay[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  currentMonth: string; // YYYY-MM
  onMonthChange: (newMonth: string) => void;
  isLoading?: boolean;
  viewMode?: 'strip' | 'month';
  onToggleViewMode?: (mode: 'strip' | 'month') => void;
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  days,
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
  isLoading = false,
  viewMode = 'month',
  onToggleViewMode,
}) => {
  // Parse year and month
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const monthDate = new Date(year, month - 1, 1);
  const monthLabel = format(monthDate, 'MMMM yyyy');

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 2, 1);
    onMonthChange(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const next = new Date(year, month, 1);
    onMonthChange(format(next, 'yyyy-MM'));
  };

  const handleCurrentMonth = () => {
    onMonthChange(format(new Date(), 'yyyy-MM'));
  };

  // Compute padding offset for the 1st day of the month (Monday = 0, ..., Sunday = 6)
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const startDay = (getDay(firstDayOfMonth) + 6) % 7; // Convert Sun=0..Sat=6 to Mon=0..Sun=6
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);

  // Summary counts for this month
  const missingCount = days.filter((d) => d.is_missing).length;
  const targetMetCount = days.filter((d) => d.is_target_achieved).length;
  const totalLoggedHours = Math.round(
    days.reduce((acc, d) => acc + d.total_minutes, 0) / 60
  );

  return (
    <div className="bg-white rounded-2xl p-1">
      {/* Calendar Header with Navigation & Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {monthLabel}
            </h2>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
            <span>Logged: <strong className="text-slate-800">{totalLoggedHours}h</strong></span>
            <span>•</span>
            <span>Target Met: <strong className="text-emerald-600">{targetMetCount} days</strong></span>
            {missingCount > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 inline" />
                  {missingCount} Missing Worklog{missingCount > 1 ? 's' : ''} (Red)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls & Navigation (Duplicate toggle removed; kept upside one) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCurrentMonth}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            This Month
          </button>

          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-slate-200" />
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Legend Strip */}
      <div className="flex flex-wrap items-center gap-4 py-2.5 text-xs text-slate-600 border-b border-slate-100 font-medium">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Status Indicators:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Target Met (&ge; 6h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          Sub-6h Logged
        </span>
        <span className="flex items-center gap-1.5 font-bold text-rose-700">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
          Missing / Not Uploaded (Red)
        </span>
        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          Not Available (Legacy Sheet)
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          Weekend / Future
        </span>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-2 pt-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-2 pt-1">
        {/* Padding slots before day 1 */}
        {paddingDays.map((_, idx) => (
          <div
            key={`pad-${idx}`}
            className="min-h-[88px] rounded-xl bg-slate-50/40 border border-transparent opacity-30"
          />
        ))}

        {/* Days of the Month */}
        {days.map((day) => {
          const isSelected = day.work_date === selectedDate;
          const isNotAvailable =
            !day.is_missing &&
            (day.is_not_available || day.work_date < '2026-10-11') &&
            (!day.total_minutes || day.total_minutes === 0);

          let cellBgClass = 'bg-slate-50/70 border-slate-200 text-slate-800 hover:border-slate-400';
          let statusBadge = null;

          if (day.is_missing) {
            // RED INDICATOR FOR MISSING WORKLOG
            cellBgClass = isSelected
              ? 'bg-rose-950 border-rose-600 text-white shadow-md ring-2 ring-rose-500/40'
              : 'bg-rose-50/90 border-rose-300 text-rose-950 hover:bg-rose-100 hover:border-rose-400';

            statusBadge = (
              <span
                className={`mt-1 text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 uppercase ${
                  isSelected
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-200 text-rose-900 border border-rose-300'
                }`}
              >
                <AlertCircle className="w-3 h-3 inline text-rose-700" />
                Missing
              </span>
            );
          } else if (isNotAvailable) {
            // NOT AVAILABLE (LEGACY GOOGLE SHEETS) — NO RED COLOR
            cellBgClass = isSelected
              ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-slate-900/30'
              : 'bg-slate-100/60 border-slate-200 text-slate-500 hover:bg-slate-200/50';

            statusBadge = (
              <span
                className={`mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md inline-block ${
                  isSelected
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-slate-200/70 text-slate-600 border border-slate-300/60'
                }`}
              >
                Not Available
              </span>
            );
          } else if (day.is_target_achieved) {
            // GREEN FOR TARGET MET
            cellBgClass = isSelected
              ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-emerald-500/50'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100';

            statusBadge = (
              <span
                className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-800 text-emerald-200'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 inline text-emerald-600" />
                {day.total_formatted}
              </span>
            );
          } else if (day.total_minutes > 0) {
            // AMBER FOR SUB-6H
            cellBgClass = isSelected
              ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-amber-500/50'
              : 'bg-amber-50/70 border-amber-200 text-amber-950 hover:bg-amber-100';

            statusBadge = (
              <span
                className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-800 text-amber-200'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <Clock className="w-3 h-3 inline text-amber-600" />
                {day.total_formatted}
              </span>
            );
          } else if (day.is_weekend) {
            cellBgClass = isSelected
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-slate-100/50 border-slate-200/60 text-slate-400 hover:bg-slate-100';
            statusBadge = (
              <span className="mt-1 text-[9px] font-medium text-slate-400">
                Off
              </span>
            );
          } else if (day.is_future) {
            cellBgClass = isSelected
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-slate-50/50 border-slate-200/50 text-slate-400';
            statusBadge = (
              <span className="mt-1 text-[9px] font-medium text-slate-400">
                Upcoming
              </span>
            );
          } else if (day.is_today) {
            cellBgClass = isSelected
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-blue-50/50 border-blue-200 text-blue-900 hover:bg-blue-100/60';
            statusBadge = (
              <span className="mt-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                Pending Today
              </span>
            );
          }

          return (
            <button
              key={day.work_date}
              type="button"
              onClick={() => onSelectDate(day.work_date)}
              className={`min-h-[88px] p-2 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer relative group ${cellBgClass} ${
                isSelected ? 'ring-2 ring-slate-900' : ''
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-black leading-none">
                  {day.day_number}
                </span>

                {day.is_today && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                    Today
                  </span>
                )}
              </div>

              <div className="w-full">{statusBadge}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
