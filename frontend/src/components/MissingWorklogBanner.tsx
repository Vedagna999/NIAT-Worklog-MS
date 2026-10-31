import React, { useState } from 'react';
import { AlertCircle, Calendar, ArrowRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { MissingWorklogItem } from '../types';

interface MissingWorklogBannerProps {
  missingWorklogs: MissingWorklogItem[];
  onSelectMissingDate: (dateStr: string) => void;
  selectedDate: string;
}

export const MissingWorklogBanner: React.FC<MissingWorklogBannerProps> = ({
  missingWorklogs,
  onSelectMissingDate,
  selectedDate,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (missingWorklogs.length === 0 || isDismissed) {
    return null;
  }

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-xs text-xs text-rose-950 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-rose-600 text-white flex-shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>

          <div className="truncate">
            <span className="font-bold text-rose-900 mr-1.5">Action Required:</span>
            <span className="text-rose-800">
              You have <strong>{missingWorklogs.length}</strong> missing worklog
              {missingWorklogs.length > 1 ? 's' : ''} on past scheduled working days.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Dates' : 'View Missing Dates'}</span>
            <span className="bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-full text-[10px]">
              {missingWorklogs.length}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-rose-400 hover:text-rose-700 rounded transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Missing Dates List */}
      {isExpanded && (
        <div className="pt-3 mt-2.5 border-t border-rose-200/80 animate-in fade-in duration-150">
          <p className="text-[11px] text-rose-700 mb-2">
            Click any date below to jump to that worklog and record your activities:
          </p>
          <div className="flex flex-wrap gap-2">
            {missingWorklogs.map((item) => {
              const isCurrent = item.work_date === selectedDate;
              return (
                <button
                  key={item.work_date}
                  type="button"
                  onClick={() => onSelectMissingDate(item.work_date)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    isCurrent
                      ? 'bg-rose-900 text-white ring-2 ring-rose-500'
                      : 'bg-white text-rose-900 border border-rose-300 hover:bg-rose-100/70 hover:border-rose-400'
                  }`}
                >
                  <Calendar className="w-3 h-3 text-rose-600" />
                  <span>
                    {item.day_name}, {item.formatted_date}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    {item.days_ago === 1 ? 'Yesterday' : `${item.days_ago}d ago`}
                  </span>
                  <ArrowRight className="w-3 h-3 text-rose-600 ml-0.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
