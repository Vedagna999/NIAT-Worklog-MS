import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';
import { MentorPerformanceOverview, WorklogExceptionItem } from '../types';

interface WorklogConsistencyExceptionsProps {
  data: MentorPerformanceOverview;
  onSelectExceptionDate: (dateStr: string) => void;
}

export const WorklogConsistencyExceptions: React.FC<WorklogConsistencyExceptionsProps> = ({
  data,
  onSelectExceptionDate,
}) => {
  const {
    qualifying_working_days,
    days_with_worklog,
    days_meeting_target,
    days_below_target,
    missing_worklog_days,
    exceptions,
  } = data;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Worklog Consistency & Exceptions</h3>
            <p className="text-[11px] text-slate-500">
              Compliance against the 6-hour daily threshold on expected working days.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Total Exceptions:</span>
          <span
            className={`font-black px-2 py-0.5 rounded-full ${
              exceptions.length === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {exceptions.length}
          </span>
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Qualifying Days</div>
          <div className="text-base font-black text-slate-900 mt-0.5">{qualifying_working_days}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Worklogs Logged</div>
          <div className="text-base font-black text-slate-900 mt-0.5">{days_with_worklog}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
          <div className="text-[10px] text-emerald-700 font-semibold uppercase">Target Met (6h+)</div>
          <div className="text-base font-black text-emerald-900 mt-0.5">{days_meeting_target}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
          <div className="text-[10px] text-amber-800 font-semibold uppercase">Below Target (&lt;6h)</div>
          <div className="text-base font-black text-amber-900 mt-0.5">{days_below_target}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-center">
          <div className="text-[10px] text-rose-700 font-semibold uppercase">Missing Worklogs</div>
          <div className="text-base font-black text-rose-900 mt-0.5">{missing_worklog_days}</div>
        </div>
      </div>

      {/* Exceptions List or Clean State */}
      {exceptions.length === 0 ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Flawless Consistency!</strong> {data.mentor_name} has met or exceeded the 6-hour target for all qualifying working days in this period.
          </span>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
            <span>Identified Exceptions (Click any date to inspect daily activities):</span>
            <span>{exceptions.length} exception(s)</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {exceptions.map((exc, idx) => {
              const isMissing = exc.exception_type === 'MISSING';
              return (
                <div
                  key={idx}
                  onClick={() => onSelectExceptionDate(exc.work_date)}
                  className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 ${
                        isMissing
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isMissing ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {exc.formatted_date}
                        </span>
                        <span className="text-[11px] text-slate-500">({exc.day_name})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {isMissing ? (
                          <span className="text-rose-700 font-medium">
                            No worklog recorded on this scheduled working day
                          </span>
                        ) : (
                          <span className="text-amber-800 font-medium">
                            Recorded {exc.total_hours} ({exc.activity_count} activities) — below 6h threshold
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isMissing
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isMissing ? 'Missing Worklog' : 'Sub-6h Day'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
