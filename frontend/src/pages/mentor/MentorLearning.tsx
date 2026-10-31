import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Search,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  Tag,
  Filter,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../../services/api';

export const MentorLearning: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [learningData, setLearningData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchLearningRecords = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getMyLearning({
        search: searchQuery.trim() || undefined,
        date_range: dateRange,
        start_date: dateRange === 'custom' ? customStartDate : undefined,
        end_date: dateRange === 'custom' ? customEndDate : undefined
      });
      setLearningData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch learning records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningRecords();
  }, [dateRange]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLearningRecords();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4 text-purple-400" />
            Upskilling & Skill Tracking
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Learning & Upskilling
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review all technologies, concepts, and practical learning outcomes documented in your worklogs.
          </p>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Learning Hours
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-900">
            {learningData?.total_learning_hours || '0h 00m'}
          </div>
          <p className="text-[11px] text-slate-500">Non-overlapping logged study time</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Distinct Topics
            <BookOpen className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-900">
            {learningData?.distinct_topics_count || 0}
          </div>
          <p className="text-[11px] text-slate-500">Unique technologies & modules</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Practical Outcomes
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {learningData?.practical_outcomes_count || 0}
          </div>
          <p className="text-[11px] text-slate-500">Hands-on exercises & outputs</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Activities
            <Tag className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {learningData?.total_activities_count || 0}
          </div>
          <p className="text-[11px] text-slate-500">Total learning activity rows</p>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or outcome, e.g. Python, OOP, Node.js..."
              className="w-full pl-10 pr-8 py-2 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-slate-50 text-slate-800 text-xs font-medium rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Range...</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              Search
            </button>
          </div>
        </form>

        {/* Custom date range fields */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs pt-1">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
            />
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={fetchLearningRecords}
              className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* 4. Learning Activities List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Documented Learning Records ({learningData?.activities?.length || 0})
          </h2>
          <span className="text-xs text-slate-500">Chronological history</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading learning records...</div>
        ) : learningData?.activities && learningData.activities.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {learningData.activities.map((act: any) => (
              <div
                key={act.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-700 font-mono">
                      {act.formatted_date}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-slate-600">
                      {act.start_time_formatted} - {act.end_time_formatted}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[10px]">
                      {act.category_name}
                    </span>
                    <span className="font-bold text-slate-900">{act.duration_formatted}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{act.task_name}</h3>

                  {act.outcome && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-800">
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
                        Recorded Outcome:
                      </div>
                      <p className="text-slate-800 font-medium whitespace-pre-line">{act.outcome}</p>
                    </div>
                  )}

                  {act.task_description && (
                    <p className="text-slate-500 text-[11px]">{act.task_description}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/mentor/daily?date=${act.work_date}`)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0 cursor-pointer"
                  title="Open in Daily Worklog"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Day's Log</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No learning records found</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Log learning activities under "NIAT-Learnings" in your Daily Worklog to see them tracked here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
