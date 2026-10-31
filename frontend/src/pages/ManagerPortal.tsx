import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO, addDays, subDays } from 'date-fns';
import {
  Users,
  Calendar,
  MessageSquare,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Layers,
  ArrowRight,
  Search,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import {
  ManagerDashboardView,
  MentorRosterItem,
  WorklogStatus,
  MonthlyCalendarDay,
  MentorPerformanceOverview
} from '../types';
import { PerformanceSummaryCards } from '../components/PerformanceSummaryCards';
import { LearningOverviewSection } from '../components/LearningOverviewSection';
import { CategoryDistributionBarChart } from '../components/CategoryDistributionBarChart';
import { WorklogConsistencyExceptions } from '../components/WorklogConsistencyExceptions';
import { MonthlyCalendar } from '../components/MonthlyCalendar';
import { DateStrip } from '../components/DateStrip';
import { formatTimeHHmm, formatFeedbackDateTime } from '../utils/formatTime';
import { useAuth } from '../context/AuthContext';

export const ManagerPortal: React.FC = () => {
  const { user } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Mentors list and selection
  const [mentors, setMentors] = useState<MentorRosterItem[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');

  // URL search params (e.g. when navigated from Mentor Skill Finder)
  const [searchParams] = useSearchParams();
  const paramMentorId = searchParams.get('mentor_id');
  const paramDate = searchParams.get('date');
  const paramHighlightActivity = searchParams.get('highlight_activity');
  const paramFromSkillFinder = searchParams.get('from_skill_finder') === 'true';
  const paramSkillQuery = searchParams.get('skill_query') || '';

  // Reporting period state (Section A)
  const [period, setPeriod] = useState<'week' | 'month' | 'last_month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Performance & Analytics Overview State (Sections B, C, D, E)
  const [analyticsData, setAnalyticsData] = useState<MentorPerformanceOverview | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(true);

  // Daily Worklog Inspection State (Section F)
  const [selectedDate, setSelectedDate] = useState<string>(paramDate || todayStr);
  const [dashboardData, setDashboardData] = useState<ManagerDashboardView | null>(null);
  const [isDailyLoading, setIsDailyLoading] = useState<boolean>(false);

  // Calendar view mode: 'month' (default primary) vs 'strip' (optional)
  const [viewMode, setViewMode] = useState<'month' | 'strip'>('month');
  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    paramDate ? paramDate.substring(0, 7) : format(new Date(), 'yyyy-MM')
  );
  const [monthlyDays, setMonthlyDays] = useState<MonthlyCalendarDay[]>([]);

  // Expanded Activity Details row in Table
  const [expandedRowId, setExpandedRowId] = useState<string | null>(paramHighlightActivity);

  // Manager Remarks state
  const [remarksInput, setRemarksInput] = useState<string>('');
  const [isSubmittingRemarks, setIsSubmittingRemarks] = useState<boolean>(false);

  // Top navigation view ('dashboard' vs 'roster')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'roster'>('dashboard');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Handle URL params updates
  useEffect(() => {
    if (paramDate) {
      setSelectedDate(paramDate);
      setCurrentMonth(paramDate.substring(0, 7));
    }
    if (paramHighlightActivity) {
      setExpandedRowId(paramHighlightActivity);
      setTimeout(() => {
        document.getElementById('activity-breakdown-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }, [paramDate, paramHighlightActivity]);

  // 1. Load assigned mentors on mount
  useEffect(() => {
    async function loadMentors() {
      try {
        const list = await api.getAssignedMentors();
        setMentors(list);
        if (list.length > 0) {
          if (paramMentorId && list.some((m) => m.id === paramMentorId)) {
            setSelectedMentorId(paramMentorId);
          } else {
            setSelectedMentorId((prev) => {
              if (!prev || !list.some((m) => m.id === prev)) {
                return list[0].id;
              }
              return prev;
            });
          }
        } else {
          setSelectedMentorId('');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load assigned mentors.');
      }
    }
    loadMentors();
  }, [user?.id, paramMentorId]);

  // 2. Fetch Analytics whenever mentor or period changes
  const fetchAnalytics = async (mId: string, p: string, sDate?: string, eDate?: string) => {
    if (!mId) return;
    setIsAnalyticsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getMentorAnalytics(
        mId,
        p,
        p === 'custom' ? sDate : undefined,
        p === 'custom' ? eDate : undefined
      );
      setAnalyticsData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load mentor performance analytics.');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMentorId) {
      fetchAnalytics(selectedMentorId, period, customStartDate, customEndDate);
    }
  }, [selectedMentorId, period, customStartDate, customEndDate]);

  // 3. Fetch daily worklog whenever mentor or selectedDate changes
  const fetchDailyWorklog = async (mId: string, dStr: string) => {
    if (!mId) return;
    setIsDailyLoading(true);
    try {
      const data = await api.getManagerDashboard(mId, dStr);
      setDashboardData(data);
    } catch (err: any) {
      console.warn('Failed to load daily worklog', err);
    } finally {
      setIsDailyLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMentorId) {
      fetchDailyWorklog(selectedMentorId, selectedDate);
    }
  }, [selectedMentorId, selectedDate]);

  // 4. Fetch monthly calendar days when mentor or month changes
  const fetchMonthlyCalendar = async (mId: string, monthStr: string) => {
    if (!mId) return;
    try {
      const days = await api.getManagerMonthlyCalendar(mId, monthStr);
      setMonthlyDays(days);
    } catch (err) {
      console.warn('Failed to fetch monthly calendar for mentor', err);
    }
  };

  useEffect(() => {
    if (selectedMentorId) {
      fetchMonthlyCalendar(selectedMentorId, currentMonth);
    }
  }, [selectedMentorId, currentMonth]);

  // Handle switching to an exception date from Section E
  const handleSelectExceptionDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const elem = document.getElementById('worklog-history-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Date strip handlers
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
  };
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

  // Submit Remarks
  const handleAddRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarksInput.trim()) return;
    if (!selectedMentorId) {
      setErrorMsg('No mentor selected to leave remarks for.');
      return;
    }

    setIsSubmittingRemarks(true);
    setErrorMsg('');
    try {
      await api.leaveFeedback(
        dashboardData?.worklog?.id,
        remarksInput.trim(),
        selectedMentorId,
        selectedDate
      );
      setRemarksInput('');
      setSuccessMsg('Remarks successfully submitted.');
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchDailyWorklog(selectedMentorId, selectedDate);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit remarks.');
    } finally {
      setIsSubmittingRemarks(false);
    }
  };

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

  const selectedMentorObj = mentors.find((m) => m.id === selectedMentorId);

  // Status flags for the selected day in Section F
  const SYSTEM_START_DATE = '2026-10-11';
  const isBeforeInception = selectedDate < SYSTEM_START_DATE;
  const isPastDate = selectedDate < todayStr;
  const isSelectedDateMissing =
    isPastDate &&
    !isBeforeInception &&
    parseISO(selectedDate).getDay() !== 0 &&
    (!dashboardData?.worklog ||
      dashboardData.worklog.status !== 'SUBMITTED' ||
      dashboardData.worklog.total_actual_minutes === 0);

  const isSelectedDateNotAvailable =
    isBeforeInception &&
    (!dashboardData?.worklog || dashboardData.worklog.total_actual_minutes === 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Return to Mentor Skill Finder Banner */}
      {paramFromSkillFinder && (
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-md border border-indigo-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Inspecting Original Daily Worklog
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

      {/* ======================================================== */}
      {/* SECTION A: COMPACT HEADER                                */}
      {/* ======================================================== */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-sm p-4 sm:p-5 border border-slate-800 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Mentor Indicator */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                Mentor Performance Overview
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Shared Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reviewing: <strong className="text-blue-400 font-bold">{selectedMentorObj?.full_name || 'Selected Mentor'}</strong>
              {selectedMentorObj && <span className="text-slate-500"> ({selectedMentorObj.email})</span>}
            </p>
          </div>

          {/* Mentor Selector Dropdown & Quick Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mentor Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Mentor:</span>
              <select
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="text-xs font-semibold rounded-xl bg-slate-800 border border-slate-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[190px]"
              >
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Links: Roster & Reports */}
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
              <button
                onClick={() => setActiveTab(activeTab === 'dashboard' ? 'roster' : 'dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'roster'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roster ({mentors.length})</span>
              </button>

              <Link
                to="/reports"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Reports</span>
              </Link>

              <Link
                to="/skill-finder"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Skill Finder</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Reporting Period Selector */}
        {activeTab === 'dashboard' && (
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-semibold mr-1">Period:</span>
              <button
                onClick={() => setPeriod('week')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  period === 'week'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  period === 'month'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                This Month (Default)
              </button>
              <button
                onClick={() => setPeriod('last_month')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  period === 'last_month'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => setPeriod('custom')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  period === 'custom'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Custom Range Date Pickers */}
            {period === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700 animate-in fade-in">
                <span className="text-[11px] text-slate-400">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 text-white px-2 py-0.5 rounded border border-slate-700 text-xs focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 text-white px-2 py-0.5 rounded border border-slate-700 text-xs focus:outline-none"
                />
              </div>
            )}

            {/* Selected Range Display */}
            {analyticsData && (
              <div className="text-[11px] text-slate-400 font-mono">
                Showing: {analyticsData.start_date} to {analyticsData.end_date}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error & Success Notification Banners */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Roster View Tab */}
      {activeTab === 'roster' ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Assigned Mentors</h2>
              <p className="text-xs text-slate-500">
                Only mentors assigned directly to your manager account are accessible.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              Back to Overview
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {mentors.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMentorId(m.id);
                  setActiveTab('dashboard');
                }}
                className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                  m.id === selectedMentorId ? 'bg-blue-50/60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                    {m.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{m.full_name}</div>
                    <div className="text-xs text-slate-500">{m.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Today's Logged Time</div>
                    <div className="text-sm font-bold text-slate-800">
                      {Math.floor(m.today_minutes / 60)}h {(m.today_minutes % 60).toString().padStart(2, '0')}m
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      m.today_target_achieved
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.today_minutes > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.today_target_achieved ? 'Target Met (6h+)' : m.today_minutes > 0 ? 'Sub-6h' : 'No Log'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Analytics & Performance Dashboard */
        <>
          {analyticsData && (
            <>
              {/* ======================================================== */}
              {/* SECTION B: OVERALL PERFORMANCE SUMMARY                   */}
              {/* ======================================================== */}
              <PerformanceSummaryCards data={analyticsData} />

              {/* ======================================================== */}
              {/* SECTION C: LEARNING & UPSKILLING OVERVIEW (HIGHEST PRIORITY) */}
              {/* ======================================================== */}
              <LearningOverviewSection data={analyticsData} />

              {/* 2-Column Grid for Sections D & E on wide displays */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ======================================================== */}
                {/* SECTION D: CATEGORY-WISE TIME DISTRIBUTION               */}
                {/* ======================================================== */}
                <CategoryDistributionBarChart
                  categories={analyticsData.category_distribution}
                  totalActualHours={analyticsData.total_actual_hours}
                />

                {/* ======================================================== */}
                {/* SECTION E: WORKLOG CONSISTENCY & EXCEPTIONS              */}
                {/* ======================================================== */}
                <WorklogConsistencyExceptions
                  data={analyticsData}
                  onSelectExceptionDate={handleSelectExceptionDate}
                />
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* SECTION F: WORKLOG HISTORY — SECONDARY SECTION           */}
          {/* ======================================================== */}
          <div id="worklog-history-section" className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Worklog History & Daily Inspection
                </h2>
                <p className="text-xs text-slate-500">
                  Select any calendar date to inspect specific tasks, time stamps, outcomes, and submit feedback.
                </p>
              </div>

              {/* Switchable View Pill */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'month'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly Calendar
                </button>
                <button
                  onClick={() => setViewMode('strip')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'strip'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Strip View
                </button>
              </div>
            </div>

            {/* Calendar / Date Navigation */}
            {viewMode === 'month' ? (
              <MonthlyCalendar
                days={monthlyDays}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                currentMonth={currentMonth}
                onMonthChange={(m) => setCurrentMonth(m)}
              />
            ) : (
              dashboardData && (
                <DateStrip
                  dates={dashboardData.date_strip}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  onNavigatePrev={handlePrevDay}
                  onNavigateNext={handleNextDay}
                  onGoToToday={handleGoToToday}
                />
              )
            )}

            {/* Missing Worklog Warning for the active date (Oct 11 onwards) */}
            {isSelectedDateMissing && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-950 animate-in fade-in">
                <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-rose-900">
                    Missing Worklog Alert (Red)
                  </div>
                  <div className="text-rose-800">
                    <strong>{selectedMentorObj?.full_name}</strong> has not uploaded any worklog for this working day ({format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}).
                  </div>
                </div>
              </div>
            )}

            {/* Legacy Data Info for dates before 11 Oct */}
            {isSelectedDateNotAvailable && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-700 animate-in fade-in">
                <div className="p-2 rounded-xl bg-slate-200 text-slate-600 shadow-xs flex-shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">
                    Data Not Available in System
                  </div>
                  <div className="text-slate-500">
                    Worklogs prior to 11 October were recorded in Google Sheets and are not tracked in this portal.
                  </div>
                </div>
              </div>
            )}

            {/* Activity Breakdown Table for Selected Date */}
            <div id="activity-breakdown-section" className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Activity Breakdown for {format(parseISO(selectedDate), 'd MMMM yyyy')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {dashboardData?.worklog?.activities?.length || 0} activities recorded
                    {dashboardData?.worklog?.total_actual_minutes !== undefined &&
                      ` • Total Duration: ${Math.floor((dashboardData.worklog.total_actual_minutes || 0) / 60)}h ${((dashboardData.worklog.total_actual_minutes || 0) % 60).toString().padStart(2, '0')}m`}
                  </p>
                </div>

                {isSelectedDateMissing ? (
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-600 text-white border border-rose-700 shadow-xs uppercase flex items-center gap-1 self-start sm:self-auto">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Missing Worklog
                  </span>
                ) : isSelectedDateNotAvailable ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 uppercase flex items-center gap-1.5 self-start sm:self-auto">
                    <Info className="w-3.5 h-3.5 inline text-slate-500" />
                    Not Available (Google Sheets)
                  </span>
                ) : dashboardData?.worklog?.status ? (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase self-start sm:self-auto ${
                      dashboardData.worklog.status === 'SUBMITTED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : dashboardData.worklog.status === 'LOCKED'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {dashboardData.worklog.status}
                  </span>
                ) : null}
              </div>

              {dashboardData?.worklog?.activities && dashboardData.worklog.activities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Time Interval</th>
                        <th className="py-3 px-4">Category Badge</th>
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
                                  <span>{startTimeStr} - {endTimeStr}</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${getCategoryGroupBadge(
                                    act.category?.activity_group
                                  )}`}
                                >
                                  {act.category?.name || 'Category'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 max-w-xs">
                                <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-1.5">
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
                                  className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getStatusBadge(
                                    act.status
                                  )}`}
                                >
                                  {act.status}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => setExpandedRowId(isExpanded ? null : act.id)}
                                  className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                  title="Toggle details, remarks & deviations"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Collapsible Details Row */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-b border-slate-200">
                                <td colSpan={7} className="p-4 space-y-2 text-xs">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Remarks:
                                      </span>
                                      <p className="text-slate-700 mt-0.5">
                                        {act.remarks || <span className="italic text-slate-400">None</span>}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Dependencies:
                                      </span>
                                      <p className="text-slate-700 mt-0.5">
                                        {act.dependencies || <span className="italic text-slate-400">None</span>}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Deviations:
                                      </span>
                                      <p className="text-slate-700 mt-0.5">
                                        {act.deviations || <span className="italic text-slate-400">None</span>}
                                      </p>
                                    </div>
                                  </div>
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
                <div className="p-10 text-center">
                  <div
                    className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2.5 ${
                      isSelectedDateMissing
                        ? 'bg-rose-100 text-rose-600'
                        : isSelectedDateNotAvailable
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isSelectedDateMissing ? (
                      <AlertCircle className="w-6 h-6" />
                    ) : isSelectedDateNotAvailable ? (
                      <FileText className="w-6 h-6" />
                    ) : (
                      <Calendar className="w-6 h-6" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isSelectedDateMissing
                      ? 'No Work Logged — Missing Worklog'
                      : isSelectedDateNotAvailable
                      ? 'Data Not Available'
                      : 'No work logged for this day'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {isSelectedDateMissing
                      ? 'This mentor has not submitted any worklog for this working day.'
                      : isSelectedDateNotAvailable
                      ? 'Worklogs prior to 11 October were recorded in Google Sheets and are not available in this portal.'
                      : 'The mentor has not recorded any activities for this selected calendar date.'}
                  </p>
                </div>
              )}
            </div>

            {/* Manager Remarks Panel */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Manager Remarks & Guidance</h3>
                </div>
                <span className="text-xs text-slate-400">
                  Visible to {selectedMentorObj?.full_name || 'mentor'} on this worklog
                </span>
              </div>

              {/* Existing Remarks List */}
              {dashboardData?.worklog?.feedbacks && dashboardData.worklog.feedbacks.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {dashboardData.worklog.feedbacks.map((fb) => (
                    <div key={fb.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-bold text-slate-800">{fb.manager?.full_name || 'Manager'}</span>
                        <span>{formatFeedbackDateTime(fb.created_at)}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{fb.remarks}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Leave Remarks Input Form */}
              <form onSubmit={handleAddRemarks} className="space-y-3 pt-1">
                <textarea
                  rows={3}
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder={`Leave observations, coaching feedback, or guidance for ${selectedMentorObj?.full_name || 'this mentor'} on this day's worklog...`}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {selectedMentorObj ? `Remarks will be recorded for ${format(parseISO(selectedDate), 'd MMM yyyy')}` : ''}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingRemarks || !remarksInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmittingRemarks ? 'Submitting Remarks...' : 'Submit Remarks'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
