import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { MentorPerformanceOverview, TopicLearningItem, PracticalOutcomeItem } from '../types';

interface LearningOverviewSectionProps {
  data: MentorPerformanceOverview;
}

export const LearningOverviewSection: React.FC<LearningOverviewSectionProps> = ({ data }) => {
  const { learning_summary, topics_learned, practical_outcomes, weekly_learning_trend } = data;
  const [activeTab, setActiveTab] = useState<'topics' | 'outcomes' | 'trend'>('topics');

  const hasLearningData = learning_summary.total_learning_minutes > 0;

  // Find max weekly minutes for scaling weekly trend chart
  const maxWeeklyMins = Math.max(...weekly_learning_trend.map((w) => w.learning_minutes), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-purple-50/70 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Learning & Upskilling Overview</h2>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Core Priority
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Curriculum progression, technologies studied, and documented practical outcomes.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        {hasLearningData && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('topics')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'topics'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Topics Learned ({topics_learned.length})
            </button>
            <button
              onClick={() => setActiveTab('outcomes')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'outcomes'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Practical Outcomes ({practical_outcomes.length})
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'trend'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Trend
            </button>
          </div>
        )}
      </div>

      {/* 1. Learning Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 border-b border-slate-200 bg-slate-50/50">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Learning Time</div>
            <div className="text-lg font-black text-slate-900">{learning_summary.total_learning_hours}</div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Distinct Topics</div>
            <div className="text-lg font-black text-slate-900">{learning_summary.distinct_topics_count} Topics</div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Learning Activities</div>
            <div className="text-lg font-black text-slate-900">{learning_summary.learning_activities_count} Sessions</div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Practical Outcomes</div>
            <div className="text-lg font-black text-slate-900">{learning_summary.practical_outcomes_count} Documented</div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {!hasLearningData ? (
        <div className="p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Learning Activities Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {data.mentor_name} did not record any activities under NIAT-Learnings & Upskilling during this reporting period.
          </p>
        </div>
      ) : activeTab === 'topics' ? (
        /* 2. Topics Learned View */
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics_learned.map((t, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 p-4 hover:border-purple-300 transition-all bg-white shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                      Topic #{idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{t.topic}</h4>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
                      {t.total_hours}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t.activity_count} session{t.activity_count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Most recent date */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Most recent: {t.most_recent_date}</span>
                </div>

                {/* Recorded learning outcomes */}
                {t.recorded_outcomes.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Recorded Learning Outcomes:
                    </span>
                    <ul className="space-y-1">
                      {t.recorded_outcomes.map((out, oIdx) => (
                        <li
                          key={oIdx}
                          className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{out}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic">
                    No specific outcome documented for this topic entry.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'outcomes' ? (
        /* 3. Practical Outcomes View */
        <div className="p-5 space-y-3">
          <div className="text-xs text-slate-500">
            Documented achievements, practice tasks, and concepts implemented by {data.mentor_name}:
          </div>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {practical_outcomes.map((item, idx) => (
              <div key={idx} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-snug">{item.outcome}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {item.task_name}
                      </span>
                      <span>•</span>
                      <span>{item.work_date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 self-end sm:self-center">
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {item.minutes_formatted}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 4. Weekly Learning Trend View */
        <div className="p-5 space-y-4">
          <div className="text-xs text-slate-500">
            Weekly distribution of learning and upskilling hours across the selected period:
          </div>
          <div className="space-y-3">
            {weekly_learning_trend.map((w, idx) => {
              const widthPct = maxWeeklyMins > 0 ? (w.learning_minutes / maxWeeklyMins) * 100 : 0;
              return (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{w.week_label}</span>
                    <span className="text-xs font-black text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      {w.learning_hours}
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(widthPct, w.learning_minutes > 0 ? 4 : 0)}%` }}
                    />
                  </div>

                  {/* Topics covered in this week */}
                  {w.topics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Topics:</span>
                      {w.topics.map((tp, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700"
                        >
                          {tp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
