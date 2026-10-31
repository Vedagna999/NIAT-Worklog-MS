import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Search,
  ExternalLink,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const ManagerTeamOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'week' | 'month' | 'last_month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchOverview = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getTeamOverview(
        period,
        period === 'custom' ? customStartDate : undefined,
        period === 'custom' ? customEndDate : undefined
      );
      setOverviewData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load team overview data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [period]);

  const handleCustomApply = () => {
    if (customStartDate && customEndDate) {
      fetchOverview();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header & Period Selector */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              <Users className="w-4 h-4 text-blue-400" />
              Manager Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Team Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              High-level intelligence on your assigned mentors, working hours, and compliance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              to="/skill-finder"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              Skill Finder
            </Link>
            <Link
              to="/reports"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              Reports
            </Link>
          </div>
        </div>

        {/* Period Selector */}
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

          {/* Custom Date Pickers */}
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
                onClick={handleCustomApply}
                className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-bold"
              >
                Apply
              </button>
            </div>
          )}

          {overviewData && (
            <div className="text-[11px] text-slate-400 font-mono">
              Period: {overviewData.start_date} to {overviewData.end_date}
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

      {/* 2. Team Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Total Mentors */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Team Size
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {overviewData?.total_mentors || 0}
          </div>
          <p className="text-[11px] text-slate-500">Assigned mentors</p>
        </div>

        {/* Total Working Hours */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Team Hours
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-900">
            {overviewData?.total_team_working_hours || '0h 00m'}
          </div>
          <p className="text-[11px] text-slate-500">Recorded in period</p>
        </div>

        {/* Total Learning Hours */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Learning Hours
            <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-900">
            {overviewData?.total_team_learning_hours || '0h 00m'}
          </div>
          <p className="text-[11px] text-slate-500">Team upskilling time</p>
        </div>

        {/* Missing Worklogs */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Missing Logs
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {overviewData?.total_missing_worklogs_count || 0}
          </div>
          <p className="text-[11px] text-slate-500">Working days unsubmitted</p>
        </div>

        {/* Today's Target Compliance */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Today's Target
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {overviewData?.mentors_meeting_target_today || 0} / {overviewData?.total_mentors || 0}
          </div>
          <p className="text-[11px] text-slate-500">Hit ≥ 6h threshold today</p>
        </div>
      </div>

      {/* 3. Mentor Roster Cards / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Assigned Mentors Roster ({overviewData?.mentors?.length || 0})
            </h2>
            <p className="text-xs text-slate-500">
              Select a mentor to review comprehensive analytics or daily activity records.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading team roster...</div>
        ) : overviewData?.mentors && overviewData.mentors.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {overviewData.mentors.map((m: any) => {
              const initials = m.full_name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={m.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Mentor Info Left */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-blue-900 text-white font-black text-base flex items-center justify-center shadow-md">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{m.full_name}</h3>
                        <span className="text-xs font-mono text-slate-500">({m.email})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>
                          Today:{' '}
                          <strong className="text-slate-800">
                            {m.today_hours} ({m.today_status})
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Period Total:{' '}
                          <strong className="text-blue-900 font-bold">
                            {m.period_working_hours}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Learning:{' '}
                          <strong className="text-purple-900 font-bold">
                            {m.period_learning_hours}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/manager/skills?mentor_id=${m.id}`)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Skills & Growth</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/manager/insights?mentor_id=${m.id}`)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Mentor Insights</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/manager/worklogs?mentor_id=${m.id}`)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Worklog History</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No mentors currently assigned to your manager account.
          </div>
        )}
      </div>
    </div>
  );
};
