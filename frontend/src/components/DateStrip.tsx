import React from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarDays, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { DatePillSummary } from '../types';

interface DateStripProps {
  dates: DatePillSummary[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onGoToToday: () => void;
  viewMode?: 'strip' | 'month';
  onToggleViewMode?: (mode: 'strip' | 'month') => void;
}

export const DateStrip: React.FC<DateStripProps> = ({
  dates,
  selectedDate,
  onSelectDate,
  onNavigatePrev,
  onNavigateNext,
  onGoToToday,
  viewMode = 'strip',
  onToggleViewMode,
}) => {
  return (
    <div className="bg-white rounded-xl p-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Browse By Date
          </span>

          {/* Quick indicator legend */}
          <div className="hidden lg:flex items-center gap-2.5 ml-3 pl-3 border-l border-slate-200 text-[10px] text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Target Met (&ge;6h)
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Sub-6h
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Missing (Red)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center rounded-md border border-slate-200 overflow-hidden">
            <button
              onClick={onNavigatePrev}
              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Previous days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200" />
            <button
              onClick={onNavigateNext}
              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Next days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Date Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-300">
        {dates.map((item) => {
          const dateObj = parseISO(item.work_date);
          const isSelected = item.work_date === selectedDate;
          const today = isToday(dateObj);

          // Day format e.g. "WED", "SAT"
          const dayName = format(dateObj, 'EEE').toUpperCase();
          const dayNumber = format(dateObj, 'd');
          const monthName = format(dateObj, 'MMM');

          const isNotAvailable =
            !item.is_missing &&
            (item.is_not_available || item.work_date < '2026-10-11') &&
            (!item.total_minutes || item.total_minutes === 0);

          // Status indicator color
          let statusBadgeClass = 'bg-slate-200';
          if (item.is_missing) {
            statusBadgeClass = 'bg-rose-500 ring-2 ring-rose-300';
          } else if (isNotAvailable) {
            statusBadgeClass = 'bg-slate-300';
          } else if (item.total_minutes > 0) {
            statusBadgeClass = item.is_target_achieved ? 'bg-emerald-500' : 'bg-amber-400';
          }

          let buttonBgClass =
            'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300';
          if (isSelected) {
            buttonBgClass =
              'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-slate-900/20';
          } else if (item.is_missing) {
            buttonBgClass = 'bg-rose-50/80 border-rose-300 text-rose-900 hover:bg-rose-100';
          } else if (isNotAvailable) {
            buttonBgClass =
              'bg-slate-100/60 border-slate-200/80 text-slate-500 hover:bg-slate-200/50';
          }

          return (
            <button
              key={item.work_date}
              onClick={() => onSelectDate(item.work_date)}
              className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[80px] py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${buttonBgClass}`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-bold tracking-wider ${
                    isSelected
                      ? 'text-slate-300'
                      : item.is_missing
                      ? 'text-rose-600'
                      : isNotAvailable
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  {dayName}
                </span>
                <span className={`w-2 h-2 rounded-full ${statusBadgeClass}`} />
              </div>

              <div
                className={`text-base font-black leading-tight my-0.5 ${
                  !isSelected && item.is_missing ? 'text-rose-950 font-black' : ''
                }`}
              >
                {dayNumber}
              </div>

              <div
                className={`text-[10px] font-medium leading-none ${
                  isSelected
                    ? 'text-blue-300 font-semibold'
                    : item.is_missing
                    ? 'text-rose-500 font-semibold'
                    : isNotAvailable
                    ? 'text-slate-400'
                    : 'text-slate-400'
                }`}
              >
                {today ? 'Today' : monthName}
              </div>

              {item.is_missing ? (
                <div
                  className={`mt-1 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-tight uppercase flex items-center gap-0.5 ${
                    isSelected
                      ? 'bg-rose-600 text-white border border-rose-400'
                      : 'bg-rose-200 text-rose-900 border border-rose-300'
                  }`}
                >
                  <AlertCircle className="w-2.5 h-2.5 inline" />
                  Missing
                </div>
              ) : isNotAvailable ? (
                <div
                  className={`mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-tight ${
                    isSelected
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : 'bg-slate-200/70 text-slate-500 border border-slate-300/60'
                  }`}
                >
                  Not Available
                </div>
              ) : item.total_minutes > 0 ? (
                <div
                  className={`mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${
                    isSelected
                      ? item.is_target_achieved
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                        : 'bg-amber-900/60 text-amber-300 border border-amber-700'
                      : item.is_target_achieved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {Math.floor(item.total_minutes / 60)}h {item.total_minutes % 60}m
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
