import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  BarChart3,
  Calendar,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { ReportSummary, MentorReportItem } from '../types';

export const Reports: React.FC = () => {
  const [rangeType, setRangeType] = useState<'weekly' | 'monthly'>('weekly');
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchReports = async (type: 'weekly' | 'monthly') => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getReportsSummary(type);
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch performance reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(rangeType);
  }, [rangeType]);

  // Aggregate stats across all assigned mentors
  const totalMins = report?.mentors_summary.reduce((acc, m) => acc + m.total_minutes, 0) || 0;
  const totalLearningMins = report?.mentors_summary.reduce((acc, m) => acc + m.learning_minutes, 0) || 0;
  const totalMentoringMins = report?.mentors_summary.reduce((acc, m) => acc + m.mentoring_minutes, 0) || 0;
  const totalInvigilationMins = report?.mentors_summary.reduce((acc, m) => acc + m.invigilation_minutes, 0) || 0;
  const totalTasks = report?.mentors_summary.reduce((acc, m) => acc + m.completed_tasks, 0) || 0;

  const totalH = Math.floor(totalMins / 60);
  const totalM = totalMins % 60;
  const learningH = Math.floor(totalLearningMins / 60);
  const mentoringH = Math.floor(totalMentoringMins / 60);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Mentor Performance & Time Utilization Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated metrics for assigned mentors distinguishing Learning from Mentoring and Invigilation hours.
          </p>
        </div>

        {/* Toggle Weekly vs Monthly */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setRangeType('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              rangeType === 'weekly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Report (7 Days)
          </button>
          <button
            onClick={() => setRangeType('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              rangeType === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Report (MTD)
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
          {errorMsg}
        </div>
      )}

      {/* High-level aggregate cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Logged Time</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalH}h {totalM}m
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across {report?.total_mentors || 0} mentors</p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="text-xs text-purple-700 font-semibold uppercase flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" />
            Learning Hours
          </div>
          <div className="text-2xl font-black text-purple-900 mt-1">
            {learningH}h {totalLearningMins % 60}m
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalMins > 0 ? Math.round((totalLearningMins / totalMins) * 100) : 0}% of total time
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="text-xs text-blue-700 font-semibold uppercase flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Mentoring Hours
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {mentoringH}h {totalMentoringMins % 60}m
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalMins > 0 ? Math.round((totalMentoringMins / totalMins) * 100) : 0}% of total time
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="text-xs text-emerald-700 font-semibold uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed Tasks
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {totalTasks}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Activities successfully closed</p>
        </div>
      </div>

      {/* Mentors Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <h2 className="text-base font-bold text-slate-900">Mentor Performance Summary Table</h2>
          <p className="text-xs text-slate-500">
            Reporting period: {report?.start_date} to {report?.end_date}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Mentor Name</th>
                <th className="py-3 px-4">Days Logged</th>
                <th className="py-3 px-4">6h Target Compliance</th>
                <th className="py-3 px-4">Total Hours</th>
                <th className="py-3 px-4">Learning Hours</th>
                <th className="py-3 px-4">Mentoring Hours</th>
                <th className="py-3 px-4">Invigilation</th>
                <th className="py-3 px-4">Admin/Meetings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report?.mentors_summary && report.mentors_summary.length > 0 ? (
                report.mentors_summary.map((m) => {
                  const complianceRate =
                    m.days_logged > 0 ? Math.round((m.target_achieved_days / m.days_logged) * 100) : 0;

                  return (
                    <tr key={m.mentor_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-400">{m.email}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {m.days_logged} days
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                              complianceRate >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : complianceRate >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.target_achieved_days} / {m.days_logged} ({complianceRate}%)
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {m.total_hours}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-purple-700">
                        {m.learning_hours}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-blue-700">
                        {m.mentoring_hours}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {m.invigilation_hours}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {m.admin_hours}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No data available for this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
