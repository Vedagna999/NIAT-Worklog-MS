import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, addDays, subDays } from 'date-fns';
import {
  Calendar,
  Save,
  Send,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import {
  DailyWorklog,
  Activity,
  Category,
  TaskTemplate,
  WorklogStatus
} from '../../types';
import { ProgressBar } from '../../components/ProgressBar';
import { QuickActivityEntry } from '../../components/QuickActivityEntry';
import { formatTimeHHmm, formatFeedbackDateTime } from '../../utils/formatTime';
import { useAuth } from '../../context/AuthContext';

export const MentorDailyWorklog: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const initialDate = searchParams.get('date') || todayStr;

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [worklog, setWorklog] = useState<DailyWorklog | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<Record<string, TaskTemplate[]>>({});

  // Expandable activity table rows
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // Activity currently being edited
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // 1. Load Categories and Templates on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, tmpls] = await Promise.all([
          api.getCategories(),
          api.getTaskTemplates()
        ]);
        setCategories(cats);
        setTaskTemplates(tmpls);
      } catch (err: any) {
        console.error('Failed to load categories', err);
      }
    }
    loadMeta();
  }, []);

  // Sync date from URL param if changed externally
  useEffect(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && urlDate !== selectedDate) {
      setSelectedDate(urlDate);
    }
  }, [searchParams]);

  // 2. Fetch daily worklog whenever date changes
  const fetchWorklog = async (dateStr: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getDailyWorklog(dateStr);
      setWorklog(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load worklog for this date.');
      setWorklog(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklog(selectedDate);
    // Update search param
    if (searchParams.get('date') !== selectedDate) {
      setSearchParams({ date: selectedDate });
    }
  }, [selectedDate]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const prev = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(next);
  };

  const handleGoToToday = () => {
    setSelectedDate(todayStr);
  };

  // Activity Actions
  const handleSaveActivity = async (activityData: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let savedActivity: Activity;
      if (editingActivity) {
        savedActivity = await api.updateActivity(editingActivity.id, activityData);
        setSuccessMsg('Activity updated successfully.');
        setEditingActivity(null);
      } else {
        savedActivity = await api.addActivity(activityData, selectedDate);
        setSuccessMsg('Activity logged successfully.');
      }

      // If mentor linked this activity to a skill upskilling update
      if (activityData.upskillData) {
        try {
          await api.upskillSkill({
            ...activityData.upskillData,
            worklog_id: savedActivity.worklog_id,
            activity_id: savedActivity.id,
            log_date: selectedDate,
          });
          setSuccessMsg((prev) => `${prev} Skill confidence and upskilling history updated!`);
        } catch (skillErr: any) {
          console.error('Failed to log skill upskilling:', skillErr);
        }
      }

      await fetchWorklog(selectedDate);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save activity.');
      throw err;
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.deleteActivity(activityId);
      setSuccessMsg('Activity deleted successfully.');
      await fetchWorklog(selectedDate);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete activity.');
    }
  };

  const handleUpdateStatus = async (newStatus: 'DRAFT' | 'SUBMITTED') => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updated = await api.updateWorklogStatus(newStatus, selectedDate);
      setWorklog(updated);
      setSuccessMsg(
        newStatus === 'SUBMITTED'
          ? 'Daily worklog submitted successfully for manager review!'
          : 'Worklog saved as draft.'
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update worklog status.');
    } finally {
      setIsSaving(false);
    }
  };

  // Deadline calculation
  const selectedDateObj = parseISO(selectedDate);
  const diffDays = Math.floor(
    (new Date(todayStr).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isLocked = worklog?.status === 'LOCKED' || diffDays > 3;
  const isBeforeInception = selectedDate < '2026-10-11';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Date Selector & Primary Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-0.5">
              Daily Activity Entry
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {format(selectedDateObj, 'EEEE, d MMMM yyyy')}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Record activities and hit the required 6-hour daily target.
            </p>
          </div>

          {/* Quick Date Navigation Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleGoToToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                selectedDate === todayStr
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              Today
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 text-white text-xs font-semibold rounded-xl border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Legacy Data Info for dates before 11 Oct */}
      {isBeforeInception && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-200 text-slate-600 flex-shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800">Legacy Historical Data</div>
              <div className="text-slate-500">
                Worklogs prior to 11 October 2026 were maintained in Google Sheets and imported as archive records.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 border border-slate-300 px-2.5 py-1 rounded-full">
            Archived
          </span>
        </div>
      )}

      {/* 2. Daily Working-Hours Summary & Six-Hour Progress Bar */}
      <ProgressBar
        totalMinutes={worklog?.total_actual_minutes || 0}
        qualifyingMinutes={worklog?.kpi_summary?.qualifying_minutes || worklog?.total_actual_minutes || 0}
        targetMinutes={360}
      />

      {/* 3. Add Activity Form (QuickActivityEntry) */}
      <QuickActivityEntry
        categories={categories}
        taskTemplates={taskTemplates}
        onSave={handleSaveActivity}
        editingActivity={editingActivity}
        onCancelEdit={() => setEditingActivity(null)}
        targetDate={selectedDate}
        existingActivities={worklog?.activities || []}
        isLocked={isLocked}
      />

      {/* 4. Recorded Activities Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Recorded Activities for {format(selectedDateObj, 'd MMMM yyyy')}
            </h2>
            <p className="text-xs text-slate-500">
              {worklog?.activities?.length || 0} activities recorded • Total Duration:{' '}
              {Math.floor((worklog?.total_actual_minutes || 0) / 60)}h{' '}
              {((worklog?.total_actual_minutes || 0) % 60).toString().padStart(2, '0')}m
            </p>
          </div>

          {worklog?.status && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border uppercase self-start sm:self-auto font-mono ${
                worklog.status === 'SUBMITTED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : worklog.status === 'LOCKED'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {worklog.status}
            </span>
          )}
        </div>

        {worklog?.activities && worklog.activities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Time Interval</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Activity Name</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {worklog.activities.map((act) => {
                  const startTimeStr = formatTimeHHmm(act.start_time);
                  const endTimeStr = formatTimeHHmm(act.end_time);
                  const durH = Math.floor(act.actual_minutes / 60);
                  const durM = act.actual_minutes % 60;
                  const durFormatted = `${durH}h ${durM.toString().padStart(2, '0')}m`;
                  const isExpanded = expandedActivityId === act.id;

                  return (
                    <React.Fragment key={act.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {startTimeStr} - {endTimeStr}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-slate-100 text-slate-700 border-slate-200">
                            {act.category?.name || 'Category'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs font-semibold text-slate-900">
                          {act.task_name}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs text-slate-700">
                          {act.outcome ? (
                            <span className="line-clamp-3 whitespace-pre-line text-xs">{act.outcome}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {durFormatted}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                              act.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {act.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {!isLocked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingActivity(act)}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Edit activity"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete activity"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedActivityId(isExpanded ? null : act.id)
                              }
                              className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Toggle details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4 space-y-2 text-xs">
                            {act.task_description && (
                              <div>
                                <span className="font-bold text-slate-500 uppercase text-[10px]">
                                  Description:
                                </span>
                                <p className="text-slate-700">{act.task_description}</p>
                              </div>
                            )}
                            {act.remarks && (
                              <div>
                                <span className="font-bold text-slate-500 uppercase text-[10px]">
                                  Remarks:
                                </span>
                                <p className="text-slate-700 italic">{act.remarks}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No activities logged yet for this day</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Use the Add Activity form above to enter tasks and meet the 6-hour daily threshold.
            </p>
          </div>
        )}

        {/* Footer Actions: Save Draft & Submit Daily Log */}
        {!isLocked && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>
                Configured editing deadline: <strong>3 days</strong> from work date.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus('DRAFT')}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('SUBMITTED')}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Daily Log
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Manager Feedback & Guidance (Visible if present) */}
      {worklog?.feedbacks && worklog.feedbacks.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Manager Remarks & Guidance</h3>
          </div>
          <div className="space-y-2">
            {worklog.feedbacks.map((fb) => (
              <div key={fb.id} className="bg-white p-3.5 rounded-xl border border-blue-100 text-xs shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                  <span className="font-bold text-slate-700">{fb.manager?.full_name || 'Manager'}</span>
                  <span>{formatFeedbackDateTime(fb.created_at)}</span>
                </div>
                <p className="text-slate-800 font-medium">{fb.remarks}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
