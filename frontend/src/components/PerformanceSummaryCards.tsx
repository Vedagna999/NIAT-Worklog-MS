import React from 'react';
import {
  Clock,
  BookOpen,
  Users,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Award
} from 'lucide-react';
import { MentorPerformanceOverview } from '../types';

interface PerformanceSummaryCardsProps {
  data: MentorPerformanceOverview;
}

export const PerformanceSummaryCards: React.FC<PerformanceSummaryCardsProps> = ({ data }) => {
  return (
    <div className="space-y-3">
      {/* 2 Primary Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Actual Hours (Primary) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Total Actual Hours
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Primary Metric
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {data.total_actual_hours}
            </div>
            <p className="text-xs text-slate-500">
              Across {data.qualifying_working_days} qualifying working days in this period
            </p>
          </div>
          <div className="w-13 h-13 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Clock className="w-7 h-7" />
          </div>
        </div>

        {/* Learning & Upskilling Hours (Primary) */}
        <div className="bg-white rounded-xl border border-purple-200 p-5 shadow-xs flex items-center justify-between relative overflow-hidden bg-gradient-to-r from-white to-purple-50/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-purple-700">
                Learning & Upskilling Hours
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                Core Focus
              </span>
            </div>
            <div className="text-3xl font-black text-purple-950 tracking-tight">
              {data.learning_hours}
            </div>
            <p className="text-xs text-slate-500">
              {data.learning_summary.distinct_topics_count} distinct topics • {data.learning_summary.practical_outcomes_count} outcomes documented
            </p>
          </div>
          <div className="w-13 h-13 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 flex-shrink-0">
            <BookOpen className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 4 Secondary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Mentoring Hours */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mentoring Hours</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">{data.mentoring_hours}</div>
          <div className="text-[11px] text-slate-400 mt-1">Doubt clearing & evaluations</div>
        </div>

        {/* Invigilation Hours */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Invigilation Hours</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">{data.invigilation_hours}</div>
          <div className="text-[11px] text-slate-400 mt-1">Exam & contest proctoring</div>
        </div>

        {/* Days Meeting Six-Hour Target */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Days Meeting Target</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{data.days_meeting_target}</span>
            <span className="text-xs text-slate-400 font-medium">/ {data.qualifying_working_days} days</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {data.days_below_target > 0 ? `${data.days_below_target} sub-target day(s)` : '100% on target'}
          </div>
        </div>

        {/* Worklog Completion Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{data.worklog_completion_rate}%</span>
            <span className="text-xs text-slate-400">({data.days_with_worklog}/{data.qualifying_working_days})</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.worklog_completion_rate >= 90
                  ? 'bg-emerald-500'
                  : data.worklog_completion_rate >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, data.worklog_completion_rate)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
