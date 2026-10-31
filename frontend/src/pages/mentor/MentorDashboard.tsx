import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  FileText,
  CalendarDays,
  GraduationCap,
  Sparkles,
  Send,
  Eye,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { DailyWorklog, MissingWorklogItem, MentorSkillsProfileSummary } from '../../types';
import { ProgressBar } from '../../components/ProgressBar';
import { MissingWorklogBanner } from '../../components/MissingWorklogBanner';
import { formatTimeHHmm } from '../../utils/formatTime';
import { useAuth } from '../../context/AuthContext';

export const MentorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [worklog, setWorklog] = useState<DailyWorklog | null>(null);
  const [missingWorklogs, setMissingWorklogs] = useState<MissingWorklogItem[]>([]);
  const [skillsProfile, setSkillsProfile] = useState<MentorSkillsProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const [todayLog, missingList, skills] = await Promise.all([
          api.getDailyWorklog(todayStr),
          api.getMissingWorklogs().catch(() => []),
          api.getMySkills().catch(() => null)
        ]);
        setWorklog(todayLog);
        setMissingWorklogs(missingList);
        setSkillsProfile(skills);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [todayStr]);

  const totalMinutes = worklog?.total_actual_minutes || 0;
  const targetMinutes = 360;
  const isTargetAchieved = totalMinutes >= targetMinutes;
  const remainingMinutes = Math.max(0, targetMinutes - totalMinutes);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header & Welcome */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Mentor Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Today is <strong className="text-white">{format(new Date(), 'EEEE, d MMMM yyyy')}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            to="/mentor/daily"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Compact Missing Worklog Alert Banner */}
      <MissingWorklogBanner
        missingWorklogs={missingWorklogs}
        onSelectMissingDate={(dateStr) => {
          navigate(`/mentor/daily?date=${dateStr}`);
        }}
        selectedDate={todayStr}
      />

      {/* 2b. Skills Profile Completion Prompt Banner */}
      {skillsProfile && (!skillsProfile.is_profile_completed || skillsProfile.total_skills === 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md border border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Complete your Mentor Skills Profile
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5 max-w-xl leading-relaxed">
                Add your technical proficiencies (Python, React, SQL, AI/ML, etc.) and self-assess confidence to personalize your mentoring journey and student cohort matching.
              </p>
            </div>
          </div>
          <Link
            to="/mentor/skills"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 self-start sm:self-auto flex-shrink-0"
          >
            <span>Complete Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 3. Daily Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Hours Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Hours
            </span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {Math.floor(totalMinutes / 60)}h {(totalMinutes % 60).toString().padStart(2, '0')}m
          </div>
          <p className="text-[11px] text-slate-500">
            Target: 6h 00m ({Math.min(100, Math.round((totalMinutes / targetMinutes) * 100))}% completed)
          </p>
        </div>

        {/* Target Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Target Status
            </span>
            {isTargetAchieved ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div>
            {isTargetAchieved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Check className="w-3.5 h-3.5" />
                Target Met (≥ 6h)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                {Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m remaining
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {isTargetAchieved
              ? 'Required daily working threshold achieved.'
              : 'Add activities to reach minimum 6 hours.'}
          </p>
        </div>

        {/* Submission Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Log Status
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase font-mono border ${
                worklog?.status === 'SUBMITTED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : worklog?.status === 'LOCKED'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {worklog?.status || 'DRAFT'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {worklog?.status === 'SUBMITTED'
              ? 'Worklog submitted for manager review.'
              : 'Draft mode - remember to submit when done.'}
          </p>
        </div>
      </div>

      {/* 4. Six-Hour Daily Progress Bar */}
      <ProgressBar
        totalMinutes={totalMinutes}
        qualifyingMinutes={totalMinutes}
        targetMinutes={targetMinutes}
      />

      {/* 5. Today's Recorded Activities (Compact List) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today's Recorded Activities</h2>
            <p className="text-xs text-slate-500">
              {worklog?.activities?.length || 0} activities recorded today
            </p>
          </div>
          <Link
            to="/mentor/daily"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Manage in Daily Worklog →
          </Link>
        </div>

        {worklog?.activities && worklog.activities.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {worklog.activities.map((act) => {
              const startStr = formatTimeHHmm(act.start_time);
              const endStr = formatTimeHHmm(act.end_time);
              const durH = Math.floor(act.actual_minutes / 60);
              const durM = act.actual_minutes % 60;
              const durFormatted = `${durH}h ${durM.toString().padStart(2, '0')}m`;

              return (
                <div
                  key={act.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {startStr} - {endStr}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                        {act.category?.name || 'General'}
                      </span>
                      <span className="font-bold text-slate-900">{durFormatted}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{act.task_name}</div>
                    {act.outcome && (
                      <p className="text-slate-600 text-xs whitespace-pre-line">
                        <strong className="text-slate-700">Outcome:</strong> {act.outcome}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-block self-start sm:self-auto px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                      act.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {act.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">No activities recorded yet today</h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                Start tracking your learning, mentoring, and administrative tasks for today.
              </p>
            </div>
            <Link
              to="/mentor/daily"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Your First Activity
            </Link>
          </div>
        )}
      </div>

      {/* 6. Quick Action Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          to="/mentor/daily"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
            Daily Worklog
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, or submit tasks for any working date with automatic duration calculation.
          </p>
        </Link>

        <Link
          to="/mentor/history"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <CalendarDays className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center justify-between">
            My History
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Monthly calendar with target achievement indicators and missing worklog alerts.
          </p>
        </Link>

        <Link
          to="/mentor/learning"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors flex items-center justify-between">
            My Learning
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Review all upskilling topics, practice outcomes, and learning hours logged.
          </p>
        </Link>
      </div>
    </div>
  );
};
