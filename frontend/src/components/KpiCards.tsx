import React from 'react';
import { Clock, CheckCircle2, Timer, GraduationCap } from 'lucide-react';
import { KpiSummary } from '../types';

interface KpiCardsProps {
  kpi?: KpiSummary;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpi }) => {
  const totalFormatted = kpi?.total_formatted || '0h 00m';
  const completedCount = kpi?.completed_count || 0;
  const inProgressCount = kpi?.in_progress_count || 0;
  const learningFormatted = kpi?.learning_formatted || '0h 00m';
  const isTargetAchieved = kpi?.is_target_achieved || false;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Time */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 transition-all hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Time</span>
          <div className={`p-2 rounded-lg ${isTargetAchieved ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-slate-900">{totalFormatted}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isTargetAchieved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {isTargetAchieved ? 'Target Met' : 'Sub-6h'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Calculated across activities</p>
      </div>

      {/* 2. Completed Activities */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 transition-all hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-slate-900">{completedCount}</span>
          <span className="text-xs text-slate-400 font-medium">tasks closed</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Successfully finished today</p>
      </div>

      {/* 3. In Progress Activities */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 transition-all hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Timer className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-slate-900">{inProgressCount}</span>
          <span className="text-xs text-slate-400 font-medium">ongoing</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Active tasks in flight</p>
      </div>

      {/* 4. Specific Learning Time */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 transition-all hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Learning Time</span>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <GraduationCap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-indigo-900">{learningFormatted}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            Upskilling
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">NIAT-Learnings group hours</p>
      </div>
    </div>
  );
};
