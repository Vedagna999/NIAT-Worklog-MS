import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { format, parseISO, addDays, subDays } from 'date-fns';
import {
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Search
} from 'lucide-react';
import { api } from '../../services/api';
import {
  ManagerDashboardView,
  MentorRosterItem,
  MonthlyCalendarDay,
  WorklogStatus
} from '../../types';
import { MonthlyCalendar } from '../../components/MonthlyCalendar';
import { DateStrip } from '../../components/DateStrip';
import { formatTimeHHmm, formatFeedbackDateTime } from '../../utils/formatTime';

export const ManagerWorklogHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const paramMentorId = searchParams.get('mentor_id');
  const paramDate = searchParams.get('date');
  const paramHighlightActivity = searchParams.get('highlight_activity') || searchParams.get('activity_id');
  const paramFromSkillFinder = searchParams.get('from_skill_finder') === 'true';
  const paramSkillQuery = searchParams.get('skill_query') || '';

  const [mentors, setMentors] = useState<MentorRosterItem[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>(
    paramMentorId || sessionStorage.getItem('niat_selected_mentor') || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(paramDate || todayStr);

  const [dashboardData, setDashboardData] = useState<ManagerDashboardView | null>(null);
  const [isDailyLoading, setIsDailyLoading] = useState<boolean>(false);

  // Calendar view mode: 'month' (primary) vs 'strip' (optional)
  const [viewMode, setViewMode] = useState<'month' | 'strip'>('month');
  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    paramDate ? paramDate.substring(0, 7) : format(new Date(), 'yyyy-MM')
  );
  const [monthlyDays, setMonthlyDays] = useState<MonthlyCalendarDay[]>([]);

  // Expanded row in table
  const [expandedRowId, setExpandedRowId] = useState<string | null>(paramHighlightActivity);

  // Remarks state
  const [remarksInput, setRemarksInput] = useState<string>('');
  const [isSubmittingRemarks, setIsSubmittingRemarks] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // 1. Load assigned mentors
  useEffect(() => {
    async function loadMentors() {
      try {
        const list = await api.getAssignedMentors();
        setMentors(list);
        if (list.length > 0) {
          if (paramMentorId && list.some((m) => m.id === paramMentorId)) {
            setSelectedMentorId(paramMentorId);
          } else if (!selectedMentorId || !list.some((m) => m.id === selectedMentorId)) {
            setSelectedMentorId(list[0].id);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load assigned mentors.');
      }
    }
    loadMentors();
  }, [paramMentorId]);

  // Sync date from URL if changed
  useEffect(() => {
    if (paramDate && paramDate !== selectedDate) {
      setSelectedDate(paramDate);
      setCurrentMonth(paramDate.substring(0, 7));
    }
    if (paramHighlightActivity) {
      setExpandedRowId(paramHighlightActivity);
      setTimeout(() => {
        document.getElementById('activity-breakdown-table')?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }, [paramDate, paramHighlightActivity]);

  // 2. Fetch monthly calendar for the selected mentor & month
  useEffect(() => {
    async function fetchCalendar() {
      if (!selectedMentorId) return;
      try {
        const days = await api.getManagerMonthlyCalendar(selectedMentorId, currentMonth);
        setMonthlyDays(days);
      } catch (err) {
        console.warn('Failed to fetch manager monthly calendar', err);
      }
    }
    fetchCalendar();
  }, [selectedMentorId, currentMonth]);

  // 3. Fetch daily worklog for selected mentor and date
  const fetchWorklog = async (mId: string, dStr: string) => {
    if (!mId || !dStr) return;
    setIsDailyLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getManagerDashboard(mId, dStr);
      setDashboardData(data);
      sessionStorage.setItem('niat_selected_mentor', mId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch daily worklog for mentor.');
      setDashboardData(null);
    } finally {
      setIsDailyLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMentorId && selectedDate) {
      fetchWorklog(selectedMentorId, selectedDate);
    }
  }, [selectedMentorId, selectedDate]);

  // Submit Manager Remarks
  const handleRemarksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarksInput.trim() || !dashboardData?.worklog?.id) return;
    setIsSubmittingRemarks(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.leaveFeedback(dashboardData.worklog.id, remarksInput.trim());
      setSuccessMsg('Remarks and guidance shared successfully with mentor.');
      setRemarksInput('');
      await fetchWorklog(selectedMentorId, selectedDate);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmittingRemarks(false);
    }
  };

  const selectedMentorObj = mentors.find((m) => m.id === selectedMentorId);
  const totalMins = dashboardData?.worklog?.total_actual_minutes || 0;
  const isTargetAchieved = totalMins >= 360;
  const isBeforeInception = selectedDate < '2026-10-11';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Return to Skill Finder Banner if navigated from Skill Finder */}
      {paramFromSkillFinder && (
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-md border border-indigo-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Original Daily Worklog Inspection
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-200">
                Navigated from <strong className="text-white font-bold">Mentor Skill Finder</strong>{' '}
                {paramSkillQuery && (
                  <span>
                    for query <strong className="text-amber-300 font-mono">"{paramSkillQuery}"</strong>
                  </span>
                )}
                . Matching activity is highlighted below.
              </div>
            </div>
          </div>
          <Link
            to={`/skill-finder${paramSkillQuery ? `?q=${encodeURIComponent(paramSkillQuery)}` : ''}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all self-start sm:self-auto shadow-xs whitespace-nowrap cursor-pointer"
          >
            ← Return to Skill Finder
          </Link>
        </div>
      )}

      {/* 1. Header & Mentor Selector */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              Mentor Worklog History & Audit
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Worklog History: {selectedMentorObj?.full_name || 'Selected Mentor'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Browse calendar history, inspect recorded tasks, and leave coaching remarks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mentor Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Mentor:</span>
              <select
                value={selectedMentorId}
                onChange={(e) => {
                  setSelectedMentorId(e.target.value);
                  setSearchParams({ mentor_id: e.target.value, date: selectedDate });
                }}
                className="text-xs font-semibold rounded-xl bg-slate-800 border border-slate-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[180px]"
              >
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Link to Insights */}
            {selectedMentorId && (
              <button
                type="button"
                onClick={() => navigate(`/manager/insights?mentor_id=${selectedMentorId}`)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Mentor Insights →
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Monthly Calendar Section */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Monthly Worklog Calendar</h2>
            <p className="text-xs text-slate-500">
              Green indicates ≥ 6 hours met. Click any date to view detailed activities.
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('strip')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
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
            currentMonth={currentMonth}
            onMonthChange={(m) => setCurrentMonth(m)}
            selectedDate={selectedDate}
            onSelectDate={(dStr) => {
              setSelectedDate(dStr);
              setSearchParams({ mentor_id: selectedMentorId, date: dStr });
            }}
          />
        ) : (
          <DateStrip
            dates={dashboardData?.date_strip || []}
            selectedDate={selectedDate}
            onSelectDate={(dStr) => {
              setSelectedDate(dStr);
              setSearchParams({ mentor_id: selectedMentorId, date: dStr });
            }}
            onNavigatePrev={() => {
              const prev = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
              setSelectedDate(prev);
              setSearchParams({ mentor_id: selectedMentorId, date: prev });
            }}
            onNavigateNext={() => {
              const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
              setSelectedDate(next);
              setSearchParams({ mentor_id: selectedMentorId, date: next });
            }}
            onGoToToday={() => {
              setSelectedDate(todayStr);
              setSearchParams({ mentor_id: selectedMentorId, date: todayStr });
            }}
          />
        )}
      </div>

      {/* Legacy Data Info for dates before 11 Oct */}
      {isBeforeInception && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-200 text-slate-600 flex-shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800">Historical Legacy Worklog</div>
              <div className="text-slate-500">
                Worklogs prior to 11 October 2026 were maintained in Google Sheets and imported for compliance tracking.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 border border-slate-300 px-2.5 py-1 rounded-full">
            Archived
          </span>
        </div>
      )}

      {/* 3. Activity Breakdown Table for Selected Date */}
      <div id="activity-breakdown-table" className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Activity Breakdown for {format(parseISO(selectedDate), 'd MMMM yyyy')}
            </h2>
            <p className="text-xs text-slate-500">
              {dashboardData?.worklog?.activities?.length || 0} activities recorded • Total Duration:{' '}
              {Math.floor(totalMins / 60)}h {(totalMins % 60).toString().padStart(2, '0')}m
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {totalMins > 0 ? (
              isTargetAchieved ? (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Target Met (≥ 6h)
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Under Target (&lt; 6h)
                </span>
              )
            ) : null}

            {dashboardData?.worklog?.status && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-mono uppercase">
                {dashboardData.worklog.status}
              </span>
            )}
          </div>
        </div>

        {isDailyLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading daily activities...</div>
        ) : dashboardData?.worklog?.activities && dashboardData.worklog.activities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Time Interval</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dashboardData.worklog.activities.map((act) => {
                  const startTimeStr = formatTimeHHmm(act.start_time);
                  const endTimeStr = formatTimeHHmm(act.end_time);
                  const durH = Math.floor(act.actual_minutes / 60);
                  const durM = act.actual_minutes % 60;
                  const durFormatted = `${durH}h ${durM.toString().padStart(2, '0')}m`;
                  const isExpanded = expandedRowId === act.id;
                  const isHighlighted = paramHighlightActivity === act.id;

                  return (
                    <React.Fragment key={act.id}>
                      <tr
                        className={`transition-colors ${
                          isHighlighted
                            ? 'bg-amber-50/90 ring-2 ring-amber-400 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {startTimeStr} - {endTimeStr}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-slate-100 text-slate-700 border-slate-200">
                            {act.category?.name || 'Category'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs font-semibold text-slate-900">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{act.task_name}</span>
                            {isHighlighted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300 animate-pulse shadow-2xs">
                                <Sparkles className="w-3 h-3 text-amber-700" />
                                Matching Skill Activity
                              </span>
                            )}
                          </div>
                          {act.task_description && (
                            <div className="text-slate-500 text-[11px] truncate mt-0.5">
                              {act.task_description}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs text-slate-700">
                          {act.outcome ? (
                            <span className="line-clamp-3 whitespace-pre-line text-xs">{act.outcome}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {durFormatted}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                              act.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {act.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : act.id)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                            title="Toggle details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4 space-y-2 text-xs">
                            {act.remarks && (
                              <div>
                                <span className="font-bold text-slate-500 uppercase text-[10px]">
                                  Remarks:
                                </span>
                                <p className="text-slate-700 italic">{act.remarks}</p>
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
          <div className="p-8 text-center text-xs text-slate-500">
            No activities recorded on this date for this mentor.
          </div>
        )}
      </div>

      {/* 4. Manager Coaching Remarks & Guidance Section */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Manager Remarks & Guidance</h2>
        </div>

        <form onSubmit={handleRemarksSubmit} className="space-y-3">
          <textarea
            rows={3}
            value={remarksInput}
            onChange={(e) => setRemarksInput(e.target.value)}
            placeholder={`Leave coaching observations, praise, or guidance for ${
              selectedMentorObj?.full_name || 'the mentor'
            } on this date's worklog...`}
            className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingRemarks || !remarksInput.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share Guidance</span>
            </button>
          </div>
        </form>

        {/* Existing feedback history */}
        {dashboardData?.worklog?.feedbacks && dashboardData.worklog.feedbacks.length > 0 && (
          <div className="pt-3 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Previous Guidance Given:
            </div>
            {dashboardData.worklog.feedbacks.map((fb) => (
              <div key={fb.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                  <span className="font-bold text-slate-700">{fb.manager?.full_name || 'Manager'}</span>
                  <span>{formatFeedbackDateTime(fb.created_at)}</span>
                </div>
                <p className="text-slate-800 font-medium">{fb.remarks}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
