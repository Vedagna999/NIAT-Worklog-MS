import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  ExternalLink,
  Search,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { MentorRosterItem, MentorPerformanceOverview } from '../../types';
import { PerformanceSummaryCards } from '../../components/PerformanceSummaryCards';
import { LearningOverviewSection } from '../../components/LearningOverviewSection';
import { CategoryDistributionBarChart } from '../../components/CategoryDistributionBarChart';
import { WorklogConsistencyExceptions } from '../../components/WorklogConsistencyExceptions';
import { useAuth } from '../../context/AuthContext';

export const ManagerMentorInsights: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const paramMentorId = searchParams.get('mentor_id');

  const [mentors, setMentors] = useState<MentorRosterItem[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>(
    paramMentorId || sessionStorage.getItem('niat_selected_mentor') || ''
  );

  const [period, setPeriod] = useState<'week' | 'month' | 'last_month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [analyticsData, setAnalyticsData] = useState<MentorPerformanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

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

  // 2. Fetch Analytics whenever mentor or period changes
  const fetchAnalytics = async (mId: string, p: string, sDate?: string, eDate?: string) => {
    if (!mId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getMentorAnalytics(
        mId,
        p,
        p === 'custom' ? sDate : undefined,
        p === 'custom' ? eDate : undefined
      );
      setAnalyticsData(data);
      sessionStorage.setItem('niat_selected_mentor', mId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch mentor performance analytics.');
      setAnalyticsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMentorId) {
      fetchAnalytics(selectedMentorId, period, customStartDate, customEndDate);
      setSearchParams({ mentor_id: selectedMentorId });
    }
  }, [selectedMentorId, period]);

  const selectedMentorObj = mentors.find((m) => m.id === selectedMentorId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Controls */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Performance & Learning Analytics
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Mentor Insights: {selectedMentorObj?.full_name || 'Selected Mentor'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review learning outcomes, responsibility distribution, and worklog consistency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mentor Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Mentor:</span>
              <select
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="text-xs font-semibold rounded-xl bg-slate-800 border border-slate-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[180px]"
              >
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Link to Skills & Growth */}
            {selectedMentorId && (
              <button
                type="button"
                onClick={() => navigate(`/manager/skills?mentor_id=${selectedMentorId}`)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Skills & Growth →
              </button>
            )}

            {/* Quick Link to Worklog History */}
            {selectedMentorId && (
              <button
                type="button"
                onClick={() => navigate(`/manager/worklogs?mentor_id=${selectedMentorId}`)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Worklog History →
              </button>
            )}
          </div>
        </div>

        {/* Reporting Period Selector */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Period:</span>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === 'week'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === 'last_month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Custom Range
            </button>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 text-white rounded px-2 py-0.5 border border-slate-700 text-xs"
              />
              <span className="text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 text-white rounded px-2 py-0.5 border border-slate-700 text-xs"
              />
              <button
                type="button"
                onClick={() => fetchAnalytics(selectedMentorId, period, customStartDate, customEndDate)}
                className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-bold"
              >
                Apply
              </button>
            </div>
          )}

          {analyticsData && (
            <div className="text-[11px] text-slate-400 font-mono">
              Showing: {analyticsData.start_date} to {analyticsData.end_date}
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500 space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading mentor insights...</p>
        </div>
      ) : analyticsData ? (
        <>
          {/* SECTION B: OVERALL PERFORMANCE SUMMARY CARDS */}
          <PerformanceSummaryCards data={analyticsData} />

          {/* SECTION C: LEARNING & UPSKILLING OVERVIEW */}
          <LearningOverviewSection data={analyticsData} />

          {/* SECTION D: CATEGORY-WISE TIME DISTRIBUTION */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Category-Wise Time Distribution</h3>
              <p className="text-xs text-slate-500">
                Visual breakdown of hours across learning, mentoring, invigilation, and administrative tasks.
              </p>
            </div>

            <CategoryDistributionBarChart
              categories={analyticsData.category_distribution}
              totalActualHours={analyticsData.total_actual_hours}
            />
          </div>

          {/* SECTION E: WORKLOG CONSISTENCY & EXCEPTIONS */}
          <WorklogConsistencyExceptions
            data={analyticsData}
            onSelectExceptionDate={(dateStr: string) => {
              navigate(`/manager/worklogs?mentor_id=${selectedMentorId}&date=${dateStr}`);
            }}
          />
        </>
      ) : null}
    </div>
  );
};
