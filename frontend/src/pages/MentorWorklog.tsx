import React, { useState, useEffect } from 'react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import {
  Calendar,
  Save,
  Send,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  FileText,
  PieChart as PieChartIcon
} from 'lucide-react';
import { api } from '../services/api';
import {
  DailyWorklog,
  Activity,
  Category,
  TaskTemplate,
  MissingWorklogItem,
  MonthlyCalendarDay
} from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { MissingWorklogBanner } from '../components/MissingWorklogBanner';
import { QuickActivityEntry } from '../components/QuickActivityEntry';
import { MonthlyCalendar } from '../components/MonthlyCalendar';
import { DateStrip } from '../components/DateStrip';
import { CategoryBreakdownChart } from '../components/CategoryBreakdownChart';
import { formatTimeHHmm, formatFeedbackDateTime } from '../utils/formatTime';

export const MentorWorklog: React.FC = () => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [worklog, setWorklog] = useState<DailyWorklog | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<Record<string, TaskTemplate[]>>({});

  // Missing worklogs for compact reminder
  const [missingWorklogs, setMissingWorklogs] = useState<MissingWorklogItem[]>([]);

  // History section view mode: 'month' (primary) vs 'strip' (optional)
  const [viewMode, setViewMode] = useState<'month' | 'strip'>('month');
  const [currentMonth, setCurrentMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));
  const [monthlyDays, setMonthlyDays] = useState<MonthlyCalendarDay[]>([]);

  // Expandable activity table rows
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // Optional category breakdown toggle
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState<boolean>(false);

  // Activity currently being edited
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // 1. Load Categories and Templates on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, tmpls] = await Promise.all([
          api.getCategories(),
          api.getTaskTemplates()
        ]);
        setCategories(cats);
        setTaskTemplates(tmpls);
      } catch (err: any) {
        console.error('Failed to load categories', err);
      }
    }
    loadMeta();
  }, []);

  // 2. Fetch missing worklogs for reminder
  const fetchMissingWorklogs = async () => {
    try {
      const missing = await api.getMissingWorklogs();
      setMissingWorklogs(missing);
    } catch (err) {
      console.warn('Could not fetch missing worklogs', err);
    }
  };

  useEffect(() => {
    fetchMissingWorklogs();
  }, []);

  // 3. Fetch daily worklog whenever date changes
  const fetchWorklog = async (dateStr: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getDailyWorklog(dateStr);
      setWorklog(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load worklog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklog(selectedDate);
  }, [selectedDate]);

  // 4. Fetch monthly calendar data when month changes
  const fetchMonthlyCalendar = async (monthStr: string) => {
    try {
      const days = await api.getMonthlyWorklogs(monthStr);
      setMonthlyDays(days);
    } catch (err) {
      console.warn('Failed to load monthly worklogs', err);
    }
  };

  useEffect(() => {
    fetchMonthlyCalendar(currentMonth);
  }, [currentMonth]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const d = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  };

  const handleGoToToday = () => {
    setSelectedDate(todayStr);
  };

  // Status submission (Save Draft or Submit Log)
  const handleUpdateStatus = async (newStatus: 'DRAFT' | 'SUBMITTED') => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updated = await api.updateWorklogStatus(newStatus, selectedDate);
      setWorklog(updated);
      setSuccessMsg(
        newStatus === 'SUBMITTED'
          ? 'Daily worklog successfully submitted!'
          : 'Worklog draft saved successfully.'
      );
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchMissingWorklogs();
      await fetchMonthlyCalendar(currentMonth);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update worklog status.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save / Update Activity
  const handleSaveActivity = async (activityData: any) => {
    if (editingActivity) {
      await api.updateActivity(editingActivity.id, activityData);
      setSuccessMsg('Activity updated successfully.');
      setEditingActivity(null);
    } else {
      await api.addActivity(activityData, selectedDate);
      setSuccessMsg('Activity added successfully.');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
    await fetchWorklog(selectedDate);
    await fetchMissingWorklogs();
    await fetchMonthlyCalendar(currentMonth);
  };

  // Delete Activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('Are you sure you want to delete this activity entry?')) return;
    try {
      await api.deleteActivity(activityId);
      setSuccessMsg('Activity deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (editingActivity?.id === activityId) {
        setEditingActivity(null);
      }
      await fetchWorklog(selectedDate);
      await fetchMissingWorklogs();
      await fetchMonthlyCalendar(currentMonth);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete activity.');
    }
  };

  const isLocked = worklog?.status === 'LOCKED';
  const SYSTEM_START_DATE = '2026-10-11';
  const isBeforeInception = selectedDate < SYSTEM_START_DATE;
  const isPastDate = selectedDate < todayStr;
  const isSelectedDateMissing =
    isPastDate &&
    !isBeforeInception &&
    parseISO(selectedDate).getDay() !== 0 &&
    (worklog?.total_actual_minutes === 0 || worklog?.status !== 'SUBMITTED');

  const isSelectedDateNotAvailable =
    isBeforeInception &&
    (!worklog || worklog.total_actual_minutes === 0);

  const getCategoryGroupBadge = (group?: string) => {
    switch (group) {
      case 'LEARNING':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MENTORING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INVIGILATION':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ADMINISTRATIVE':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'BLOCKED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* ======================================================== */}
      {/* 1. COMPACT HEADER & SELECTED DATE CONTROLS               */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-slate-900">
              Mentor Daily Worklog
            </h1>

            {/* Status Pill */}
            {isSelectedDateMissing ? (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white border border-rose-700 shadow-2xs uppercase flex items-center gap-1">
                <AlertCircle className="w-3 h-3 inline" />
                Missing Worklog
              </span>
            ) : isSelectedDateNotAvailable ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 uppercase flex items-center gap-1">
                <Info className="w-3 h-3 inline text-slate-500" />
                Not Available (Google Sheets)
              </span>
            ) : (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                  worklog?.status === 'LOCKED'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : worklog?.status === 'SUBMITTED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {worklog?.status || 'DRAFT'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log daily activities, doubt sessions, and learning hours (<span className="text-slate-700 font-medium">Goal: 6 hours/day</span>).
          </p>
        </div>

        {/* Compact Date Navigation Bar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50 overflow-hidden shadow-2xs">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1.5 flex items-center gap-2 bg-white text-xs font-bold text-slate-800 border-x border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{format(parseISO(selectedDate), 'EEE, d MMM yyyy')}</span>
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGoToToday}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer border ${
              selectedDate === todayStr
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. COMPACT MISSING-WORKLOG ALERT (Shown only when needed) */}
      {/* ======================================================== */}
      <MissingWorklogBanner
        missingWorklogs={missingWorklogs}
        onSelectMissingDate={(d) => {
          setSelectedDate(d);
          const m = d.substring(0, 7);
          if (m !== currentMonth) setCurrentMonth(m);
        }}
        selectedDate={selectedDate}
      />

      {/* Legacy Data Info for dates before 11 Oct */}
      {isSelectedDateNotAvailable && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-slate-700 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-200 text-slate-600 flex-shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800">Legacy Worklog (Google Sheets)</div>
              <div className="text-slate-500">
                Worklogs prior to 11 October 2026 were maintained in Google Sheets and are not tracked here.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 border border-slate-300 px-2 py-0.5 rounded-full">
            Archived
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DAILY WORKING-HOURS SUMMARY & SIX-HOUR PROGRESS BAR   */}
      {/* ======================================================== */}
      <ProgressBar
        totalMinutes={worklog?.total_actual_minutes || 0}
        qualifyingMinutes={worklog?.kpi_summary?.qualifying_minutes || worklog?.total_actual_minutes || 0}
        targetMinutes={360}
      />

      {/* ======================================================== */}
      {/* 4. ADD ACTIVITY FORM (Compact, Inline, Easy to Scan)     */}
      {/* ======================================================== */}
      <QuickActivityEntry
        categories={categories}
        taskTemplates={taskTemplates}
        onSave={handleSaveActivity}
        editingActivity={editingActivity}
        onCancelEdit={() => setEditingActivity(null)}
        targetDate={selectedDate}
        existingActivities={worklog?.activities || []}
        isLocked={isLocked}
      />

      {/* ======================================================== */}
      {/* 5. RECORDED ACTIVITIES TABLE                             */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recorded Activities for Selected Date</h2>
            <p className="text-xs text-slate-500">
              {worklog?.activities?.length || 0} activities recorded • Total logged:{' '}
              <strong className="text-slate-800">
                {Math.floor((worklog?.total_actual_minutes || 0) / 60)}h{' '}
                {((worklog?.total_actual_minutes || 0) % 60).toString().padStart(2, '0')}m
              </strong>
            </p>
          </div>

          <div className="text-[11px] text-slate-400">
            Click any row to view key outcomes & details
          </div>
        </div>

        {/* Activities Table */}
        {worklog?.activities && worklog.activities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Activity</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {worklog.activities.map((act) => {
                  const startTimeStr = formatTimeHHmm(act.start_time);
                  const endTimeStr = formatTimeHHmm(act.end_time);
                  const durH = Math.floor(act.actual_minutes / 60);
                  const durM = act.actual_minutes % 60;
                  const durFormatted = `${durH}h ${durM.toString().padStart(2, '0')}m`;
                  const isExpanded = expandedActivityId === act.id;

                  return (
                    <React.Fragment key={act.id}>
                      <tr
                        onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                        className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
                          editingActivity?.id === act.id ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        {/* 1. Time Column */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {startTimeStr} - {endTimeStr}
                            </span>
                          </div>
                        </td>

                        {/* 2. Activity Column */}
                        <td className="py-3 px-4 max-w-sm">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{act.task_name}</span>
                            {act.status && act.status !== 'COMPLETED' && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${getStatusBadge(
                                  act.status
                                )}`}
                              >
                                {act.status}
                              </span>
                            )}
                          </div>
                          {act.outcome && !isExpanded && (
                            <div className="text-slate-500 text-[11px] truncate mt-0.5">
                              Outcome: {act.outcome}
                            </div>
                          )}
                        </td>

                        {/* 3. Category Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${getCategoryGroupBadge(
                              act.category?.activity_group
                            )}`}
                          >
                            {act.category?.name || 'Category'}
                          </span>
                        </td>

                        {/* 4. Duration Column */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {durFormatted}
                        </td>

                        {/* 5. Actions Column */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {!isLocked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingActivity(act);
                                    window.scrollTo({ top: 120, behavior: 'smooth' });
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Activity"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Activity"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Toggle details"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={5} className="p-3.5 space-y-2 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {act.outcome && (
                                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Documented Outcome:
                                  </span>
                                  <p className="text-slate-800 font-medium">{act.outcome}</p>
                                </div>
                              )}

                              {act.task_description && (
                                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Description / Learning Notes:
                                  </span>
                                  <p className="text-slate-700">{act.task_description}</p>
                                </div>
                              )}
                            </div>

                            {act.remarks && (
                              <div className="text-[11px] text-slate-500 italic">
                                Remarks / Notes: {act.remarks}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Clean Empty State */
          <div className="p-8 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No activities logged yet for this day</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
              Use the Quick Activity Entry form above to record your tasks and fulfill the 6-hour daily threshold.
            </p>
          </div>
        )}

        {/* Footer Actions: Save Draft & Submit Daily Log */}
        {!isLocked && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>
                Configured editing deadline: <strong>3 days</strong> from work date. (Submitted worklogs remain editable until lock)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus('DRAFT')}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('SUBMITTED')}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Daily Log
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. WORKLOG HISTORY CALENDAR (Secondary Section)          */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Worklog History & Calendar</h3>
              <p className="text-[11px] text-slate-500">
                Browse previous days to review submitted tasks or complete missing logs.
              </p>
            </div>
          </div>

          {/* Toggle between Month view and Strip view */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Calendar
            </button>
            <button
              onClick={() => setViewMode('strip')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'strip'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Strip View
            </button>
          </div>
        </div>

        {viewMode === 'month' ? (
          <MonthlyCalendar
            days={monthlyDays}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            currentMonth={currentMonth}
            onMonthChange={(m) => setCurrentMonth(m)}
          />
        ) : (
          <DateStrip
            dates={worklog?.date_strip || []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onNavigatePrev={handlePrevDay}
            onNavigateNext={handleNextDay}
            onGoToToday={handleGoToToday}
          />
        )}
      </div>

      {/* ======================================================== */}
      {/* 7. OPTIONAL CATEGORY-WISE TIME BREAKDOWN (Collapsible)   */}
      {/* ======================================================== */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
          className="w-full px-5 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-purple-600" />
            <span>Category Time Breakdown (Pie / Bar Chart)</span>
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Optional View
            </span>
          </span>
          <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            {showCategoryBreakdown ? 'Hide Breakdown' : 'Show Breakdown'}
            {showCategoryBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {showCategoryBreakdown && (
          <div className="p-5 border-t border-slate-200 bg-slate-50/40">
            <CategoryBreakdownChart
              activities={worklog?.activities}
              categories={categories}
              totalMinutes={worklog?.total_actual_minutes}
              targetMinutes={360}
            />
          </div>
        )}
      </div>

      {/* Manager Feedback Remarks Card */}
      {worklog?.feedbacks && worklog.feedbacks.length > 0 && (
        <div className="bg-blue-50/60 rounded-2xl shadow-xs border border-blue-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Manager Remarks & Guidance for this Day</span>
          </div>
          <div className="space-y-2.5">
            {worklog.feedbacks.map((fb) => (
              <div key={fb.id} className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs text-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="font-bold text-slate-800">
                    {fb.manager?.full_name || 'Assigned Manager'}
                  </span>
                  <span>{formatFeedbackDateTime(fb.created_at)}</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{fb.remarks}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
