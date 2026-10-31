import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ProgressBarProps {
  totalMinutes: number;
  qualifyingMinutes?: number;
  targetMinutes?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  totalMinutes,
  qualifyingMinutes = totalMinutes,
  targetMinutes = 360, // 6 hours threshold
}) => {
  const percentage = Math.min(Math.round((qualifyingMinutes / targetMinutes) * 100), 100);
  const isAchieved = qualifyingMinutes >= targetMinutes;

  const hours = Math.floor(qualifyingMinutes / 60);
  const minutes = qualifyingMinutes % 60;
  const loggedFormatted = `${hours}h ${minutes.toString().padStart(2, '0')}m`;

  const remaining = targetMinutes - qualifyingMinutes;
  const remHours = Math.max(0, Math.floor(remaining / 60));
  const remMinutes = Math.max(0, remaining % 60);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
            Daily Working Hours Progress
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {loggedFormatted}
            </span>
            <span className="text-xs font-semibold text-slate-400">/ 6h 00m target</span>
          </div>
        </div>

        <div>
          {isAchieved ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Target Met (6h+)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {remHours}h {remMinutes.toString().padStart(2, '0')}m remaining to 6h threshold
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Progress Track */}
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isAchieved ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          style={{ width: `${Math.max(percentage, totalMinutes > 0 ? 3 : 0)}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-medium">
        <span>0h</span>
        <span>3h (Midpoint)</span>
        <span className={isAchieved ? 'font-bold text-emerald-600' : 'text-slate-500'}>
          6h 00m (Target)
        </span>
      </div>
    </div>
  );
};
