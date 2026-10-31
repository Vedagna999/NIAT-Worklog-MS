import React, { useState } from 'react';
import {
  PieChart as PieChartIcon,
  BarChart3,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  ShieldAlert,
  Briefcase
} from 'lucide-react';
import { Activity, Category } from '../types';

interface CategoryBreakdownChartProps {
  activities?: Activity[];
  categories?: Category[];
  totalMinutes?: number;
  targetMinutes?: number; // default 360 (6 hours)
}

// 4 Main Category Buckets (Activity Groups)
const MAIN_GROUPS = [
  {
    key: 'LEARNING',
    label: 'Learning',
    badgeLabel: 'LEARNING',
    colorHex: '#8b5cf6', // Violet/Purple
    bgClass: 'bg-purple-500',
    barGradient: 'from-purple-500 to-indigo-600',
    textColor: 'text-purple-700',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    lightTrack: 'bg-purple-50/60',
    icon: BookOpen,
    description: 'NIAT-Learnings & Upskilling',
  },
  {
    key: 'MENTORING',
    label: 'Mentoring',
    badgeLabel: 'MENTORING',
    colorHex: '#3b82f6', // Blue
    bgClass: 'bg-blue-500',
    barGradient: 'from-blue-500 to-cyan-500',
    textColor: 'text-blue-700',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    lightTrack: 'bg-blue-50/60',
    icon: Users,
    description: 'Doubt clearing & evaluations',
  },
  {
    key: 'INVIGILATION',
    label: 'Invigilation',
    badgeLabel: 'INVIGILATION',
    colorHex: '#f59e0b', // Amber
    bgClass: 'bg-amber-500',
    barGradient: 'from-amber-500 to-orange-500',
    textColor: 'text-amber-800',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    lightTrack: 'bg-amber-50/60',
    icon: ShieldAlert,
    description: 'Exam & assessment proctoring',
  },
  {
    key: 'ADMINISTRATIVE',
    label: 'Administrative',
    badgeLabel: 'ADMINISTRATIVE',
    colorHex: '#10b981', // Emerald
    bgClass: 'bg-emerald-500',
    barGradient: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-700',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lightTrack: 'bg-emerald-50/60',
    icon: Briefcase,
    description: 'Meetings, content prep & ops',
  },
];

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  activities = [],
  categories = [],
  totalMinutes: propTotalMinutes,
  targetMinutes = 360, // 6h threshold
}) => {
  // Chart view mode: default 'pie' as requested by user, with switchable 'bar'
  const [chartMode, setChartMode] = useState<'pie' | 'bar'>('pie');
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Aggregate actual minutes by the 4 main groups
  const minutesByGroup: Record<string, number> = {
    LEARNING: 0,
    MENTORING: 0,
    INVIGILATION: 0,
    ADMINISTRATIVE: 0,
  };

  let computedTotal = 0;
  activities.forEach((act) => {
    const mins = act.actual_minutes || 0;
    computedTotal += mins;

    let group = act.category?.activity_group;
    if (!group) {
      const cat = categories.find((c) => c.id === act.category_id);
      group = cat?.activity_group;
    }

    if (!group) {
      const catName = act.category?.name || '';
      if (catName === 'NIAT-Learnings') group = 'LEARNING';
      else if (catName === 'Mentoring' || catName === 'Evaluation & Grading' || catName === 'Code Review') group = 'MENTORING';
      else if (catName === 'Invigilation') group = 'INVIGILATION';
      else group = 'ADMINISTRATIVE';
    }

    const normalizedKey = group ? group.toUpperCase() : 'ADMINISTRATIVE';
    minutesByGroup[normalizedKey] = (minutesByGroup[normalizedKey] || 0) + mins;
  });

  const totalMinutes = propTotalMinutes !== undefined ? propTotalMinutes : computedTotal;
  const isTargetAchieved = totalMinutes >= targetMinutes;

  const formatHoursMins = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  // Math for SVG Pie / Donut Chart
  const svgRadius = 68;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * svgRadius;

  // Compute SVG segments
  let cumulativeOffset = 0;
  const pieSegments = MAIN_GROUPS.map((group) => {
    const mins = minutesByGroup[group.key] || 0;
    const fraction = totalMinutes > 0 ? mins / totalMinutes : 0;
    const dashLength = fraction * circumference;
    const offset = -cumulativeOffset;
    if (mins > 0) {
      cumulativeOffset += dashLength;
    }
    const percent = totalMinutes > 0 ? Math.round(fraction * 100) : 0;

    return {
      ...group,
      mins,
      fraction,
      dashLength,
      offset,
      percent,
    };
  });

  // Scale for Vertical Bar Graph
  const maxGroupMins = Math.max(...Object.values(minutesByGroup), 1);
  const scaleReference = Math.max(targetMinutes, maxGroupMins);

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            {chartMode === 'pie' ? <PieChartIcon className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              Time Breakdown by Main Category
            </h3>
            <p className="text-[11px] text-slate-500">
              Learning, Mentoring, Invigilation, and Administrative hours
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher Pill: Pie Chart vs Bar Graph */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('pie')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartMode === 'pie'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5 text-purple-600" />
              Pie Chart
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              Bar Chart
            </button>
          </div>

          {/* Total Logged Pill */}
          <span className="font-mono text-xs font-black px-3 py-1.5 rounded-xl bg-slate-900 text-white shadow-2xs">
            {formatHoursMins(totalMinutes)}
          </span>
        </div>
      </div>

      {/* VIEW A: PIE CHART (Default) */}
      {chartMode === 'pie' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-1">
          {/* SVG Pie / Donut Chart */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Empty / Background track */}
                <circle
                  cx="100"
                  cy="100"
                  r={svgRadius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth={strokeWidth}
                />

                {/* Slices */}
                {totalMinutes > 0 &&
                  pieSegments.map((seg) => {
                    if (seg.mins <= 0) return null;
                    const isHovered = hoveredGroup === seg.key;

                    return (
                      <circle
                        key={seg.key}
                        cx="100"
                        cy="100"
                        r={svgRadius}
                        fill="none"
                        stroke={seg.colorHex}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                        strokeDashoffset={seg.offset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredGroup(seg.key)}
                        onMouseLeave={() => setHoveredGroup(null)}
                      />
                    );
                  })}
              </svg>

              {/* Center cutout summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Logged
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight leading-none my-0.5">
                  {formatHoursMins(totalMinutes)}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full mt-1 ${
                    isTargetAchieved
                      ? 'bg-emerald-100 text-emerald-800'
                      : totalMinutes > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isTargetAchieved ? 'Target Met' : `${formatHoursMins(targetMinutes)} Goal`}
                </span>
              </div>
            </div>
          </div>

          {/* Structured Category Breakdown Cards (Legend) */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pieSegments.map((seg) => {
              const Icon = seg.icon;
              const isHovered = hoveredGroup === seg.key;

              return (
                <div
                  key={seg.key}
                  onMouseEnter={() => setHoveredGroup(seg.key)}
                  onMouseLeave={() => setHoveredGroup(null)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-default ${
                    isHovered
                      ? 'border-slate-400 bg-slate-50/90 shadow-xs'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-2xs"
                        style={{ backgroundColor: seg.colorHex }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 leading-tight">
                          {seg.label}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                          {seg.badgeLabel}
                        </div>
                      </div>
                    </div>

                    <span className="font-black font-mono text-xs text-slate-900">
                      {seg.percent}%
                    </span>
                  </div>

                  {/* Hours badge & small indicator */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-2 text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">Logged Time:</span>
                    <span
                      className={`font-black font-mono text-xs px-2 py-0.5 rounded-md ${
                        seg.mins > 0
                          ? 'bg-slate-100 text-slate-900 font-extrabold'
                          : 'text-slate-400 bg-slate-50'
                      }`}
                    >
                      ({formatHoursMins(seg.mins)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: VERTICAL BAR GRAPH (Toggle option) */}
      {chartMode === 'bar' && (
        <div className="relative pt-4 pb-2">
          {/* Subtle 6h Target Reference Line */}
          <div
            className="absolute inset-x-0 border-b-2 border-dashed border-emerald-400/60 z-10 pointer-events-none flex items-center justify-end pr-2"
            style={{
              bottom: `${Math.min(95, Math.max(10, Math.round((targetMinutes / scaleReference) * 100)))}%`,
            }}
          >
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs">
              6h Target Line
            </span>
          </div>

          {/* 4 Vertical Columns */}
          <div className="grid grid-cols-4 gap-3 sm:gap-6 items-end h-56 px-2">
            {MAIN_GROUPS.map((group) => {
              const mins = minutesByGroup[group.key] || 0;
              const heightPercent = Math.min(100, Math.round((mins / scaleReference) * 100));
              const percentOfTotal = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;

              return (
                <div
                  key={group.key}
                  className="flex flex-col items-center h-full justify-end group cursor-default"
                >
                  <div className="mb-2 flex flex-col items-center text-center">
                    <span
                      className={`font-black font-mono text-xs leading-none transition-colors ${
                        mins > 0 ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {formatHoursMins(mins)}
                    </span>
                    {mins > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                        {percentOfTotal}%
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-full max-w-[72px] sm:max-w-[88px] h-36 rounded-2xl ${group.lightTrack} border border-slate-200/80 flex items-end p-1 relative overflow-hidden transition-all group-hover:border-slate-300 shadow-inner`}
                  >
                    {mins > 0 ? (
                      <div
                        className={`w-full rounded-xl bg-gradient-to-t ${group.barGradient} transition-all duration-500 ease-out shadow-xs`}
                        style={{
                          height: `${Math.max(heightPercent, 8)}%`,
                        }}
                      />
                    ) : (
                      <div className="w-full h-1.5 rounded-full bg-slate-200 mx-auto opacity-60" />
                    )}
                  </div>

                  <div className="mt-3 flex flex-col items-center text-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-2 h-2 rounded-full ${group.bgClass}`} />
                      <span className="font-extrabold text-xs text-slate-800">
                        {group.label}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${group.badgeClass}`}
                    >
                      {group.badgeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Target Progress Banner */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
          isTargetAchieved
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : totalMinutes > 0
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {isTargetAchieved ? '🟢' : totalMinutes > 0 ? '🟡' : '⚪'}
          </span>
          <span className="font-bold">
            Target Progress:{' '}
            <span className="font-black font-mono">
              {formatHoursMins(totalMinutes)} / {formatHoursMins(targetMinutes)}
            </span>
          </span>
          {isTargetAchieved && (
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
              (Target Met)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 font-bold">
          {isTargetAchieved ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Daily 6-Hour Requirement Fulfilled
            </span>
          ) : totalMinutes > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-800 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              {formatHoursMins(targetMinutes - totalMinutes)} remaining to target
            </span>
          ) : (
            <span className="text-slate-500 text-[11px] font-medium">
              No hours logged for this day yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
