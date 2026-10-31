import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { MonthlyCalendarDay, DailyWorklog } from '../../types';
import { MonthlyCalendar } from '../../components/MonthlyCalendar';
import { formatTimeHHmm } from '../../utils/formatTime';

export const MentorHistory: React.FC = () => {
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [currentMonth, setCurrentMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [monthlyDays, setMonthlyDays] = useState<MonthlyCalendarDay[]>([]);
  const [selectedDayLog, setSelectedDayLog] = useState<DailyWorklog | null>(null);

  const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(true);
  const [isLoadingDay, setIsLoadingDay] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 1. Fetch monthly calendar data when month changes
  useEffect(() => {
    async function loadMonth() {
      setIsLoadingMonth(true);
      setErrorMsg('');
      try {
        const days = await api.getMonthlyWorklogs(currentMonth);
        setMonthlyDays(days);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load monthly worklogs.');
      } finally {
        setIsLoadingMonth(false);
      }
    }
    loadMonth();
  }, [currentMonth]);

  // 2. Fetch specific worklog for selected date
  useEffect(() => {
    async function loadDay() {
      setIsLoadingDay(true);
      try {
        const data = await api.getDailyWorklog(selectedDate);
        setSelectedDayLog(data);
      } catch (err) {
        setSelectedDayLog(null);
      } finally {
        setIsLoadingDay(false);
      }
    }
    loadDay();
  }, [selectedDate]);

  const handleDayClick = (dayStr: string) => {
    setSelectedDate(dayStr);
  };

  const isBeforeInception = selectedDate < '2026-10-11';
  const totalMins = selectedDayLog?.total_actual_minutes || 0;
  const isTargetAchieved = totalMins >= 360;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <CalendarDays className="w-4 h-4 text-amber-400" />
            Attendance & Worklog History
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My History & Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review past worklog submissions, verify target hours, and complete missing days.
          </p>
        </div>

        <button
          onClick={() => navigate(`/mentor/daily?date=${selectedDate}`)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          Open Selected Date in Daily Worklog
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Monthly Calendar Component */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6">
        <MonthlyCalendar
          days={monthlyDays}
          currentMonth={currentMonth}
          onMonthChange={(m) => setCurrentMonth(m)}
          selectedDate={selectedDate}
          onSelectDate={handleDayClick}
        />
      </div>

      {/* 3. Selected Day Detailed Summary */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selected Worklog Date
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-0.5">
              {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isBeforeInception ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                Legacy Data (Google Sheets)
              </span>
            ) : totalMins > 0 ? (
              isTargetAchieved ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Target Met ({Math.floor(totalMins / 60)}h {(totalMins % 60).toString().padStart(2, '0')}m)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Under Target ({Math.floor(totalMins / 60)}h {(totalMins % 60).toString().padStart(2, '0')}m)
                </span>
              )
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                No Worklog Recorded
              </span>
            )}

            <button
              onClick={() => navigate(`/mentor/daily?date=${selectedDate}`)}
              className="px-3.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <span>Edit / Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Activities Table for the Selected Date */}
        {isLoadingDay ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading day's worklog...</div>
        ) : selectedDayLog?.activities && selectedDayLog.activities.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {selectedDayLog.activities.map((act) => {
              const startStr = formatTimeHHmm(act.start_time);
              const endStr = formatTimeHHmm(act.end_time);
              const durH = Math.floor(act.actual_minutes / 60);
              const durM = act.actual_minutes % 60;
              const durFormatted = `${durH}h ${durM.toString().padStart(2, '0')}m`;

              return (
                <div
                  key={act.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {startStr} - {endStr}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                        {act.category?.name || 'Category'}
                      </span>
                      <span className="font-bold text-slate-900">{durFormatted}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{act.task_name}</div>
                    {act.outcome && (
                      <p className="text-slate-600 whitespace-pre-line">
                        <strong className="text-slate-700">Outcome:</strong> {act.outcome}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-block self-start sm:self-auto px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                      act.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {act.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No activities recorded on this date.
          </div>
        )}
      </div>
    </div>
  );
};
