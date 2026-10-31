import React from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { CategoryTimeDistributionItem } from '../types';

interface CategoryDistributionBarChartProps {
  categories: CategoryTimeDistributionItem[];
  totalActualHours: string;
}

export const CategoryDistributionBarChart: React.FC<CategoryDistributionBarChartProps> = ({
  categories,
  totalActualHours,
}) => {
  // Filter out categories with 0 minutes if there are categories with >0 minutes,
  // or display all if all are 0.
  const activeCategories = categories.filter((c) => c.total_minutes > 0);
  const displayList = activeCategories.length > 0 ? activeCategories : categories;

  const getGroupBadgeClass = (group: string) => {
    switch (group) {
      case 'LEARNING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MENTORING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'INVIGILATION':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ADMINISTRATIVE':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBarColorClass = (group: string) => {
    switch (group) {
      case 'LEARNING':
        return 'bg-purple-600';
      case 'MENTORING':
        return 'bg-blue-600';
      case 'INVIGILATION':
        return 'bg-amber-500';
      case 'ADMINISTRATIVE':
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Category-Wise Time Distribution</h3>
            <p className="text-[11px] text-slate-500">
              Distribution of actual working hours across organizational categories.
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500 self-start sm:self-auto">
          Total Logged: <strong className="text-slate-900">{totalActualHours}</strong>
        </div>
      </div>

      {/* Horizontal Bar Chart List */}
      <div className="space-y-3 pt-1">
        {displayList.map((cat) => (
          <div key={cat.category_id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{cat.category_name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getGroupBadgeClass(
                    cat.activity_group
                  )}`}
                >
                  {cat.activity_group}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{cat.total_hours}</span>
                <span className="text-slate-400 font-medium w-12 text-right">
                  {cat.percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Horizontal Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColorClass(
                  cat.activity_group
                )}`}
                style={{ width: `${Math.max(cat.percentage, cat.total_minutes > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
