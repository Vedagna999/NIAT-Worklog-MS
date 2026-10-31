import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, AlertCircle, Clock, CheckCircle2, List } from 'lucide-react';
import { Category, TaskTemplate, Activity, TaskPriority, TaskStatus } from '../types';
import { formatTimeHHmm } from '../utils/formatTime';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityData: any) => Promise<void>;
  categories: Category[];
  taskTemplates?: Record<string, TaskTemplate[]>;
  editingActivity?: Activity | null;
  targetDate: string; // YYYY-MM-DD
}

// 15-minute intervals helpers for rapid selection
const TIME_OPTIONS: string[] = [];
for (let h = 8; h <= 21; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

// Preferred high-level category ordering per specification
const PREFERRED_CATEGORY_ORDER = [
  'NIAT-Learnings',
  'Mentoring',
  'Invigilation',
  'Evaluation & Grading',
  'Content Prep',
  'Internal Meetings',
  'Administrative',
];

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  editingActivity,
  targetDate,
}) => {
  const [categoryId, setCategoryId] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('11:00');

  // Optional collapsible details
  const [outcome, setOutcome] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('COMPLETED');
  const [remarks, setRemarks] = useState<string>('');
  const [dependencies, setDependencies] = useState<string>('');
  const [deviations, setDeviations] = useState<string>('');

  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Ref and smart handlers for outcome multiline and bullet points
  const outcomeTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOutcomeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;

      // Find the start of the current line
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);

      // Check if current line starts with a bullet point: "• " or "- " or "* "
      const bulletMatch = currentLine.match(/^(\s*)([•\-\*]\s+)/);

      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bulletSymbol = bulletMatch[2].includes('•') ? '• ' : bulletMatch[2];
        const lineContent = currentLine.slice(bulletMatch[0].length).trim();

        if (lineContent === '') {
          // Empty bullet line: pressing Enter removes the bullet point to cleanly exit list
          const newValue = value.slice(0, lineStart) + value.slice(selectionStart);
          setOutcome(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          });
        } else {
          // Active bullet line: insert next bullet point automatically on new line
          const insertText = '\n' + indent + bulletSymbol;
          const newValue = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
          setOutcome(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
          });
        }
      }
      // If not in a bullet line, normal Enter natively creates a new line in textarea
    }
  };

  const handleInsertBullet = () => {
    const textarea = outcomeTextareaRef.current;
    if (!textarea) {
      setOutcome((prev) => (prev ? (prev.endsWith('\n') ? prev + '• ' : prev + '\n• ') : '• '));
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const currentLine = value.slice(lineStart, selectionStart);

    let newValue: string;
    let newCursorPos: number;

    if (currentLine.startsWith('• ') || currentLine.startsWith('- ')) {
      // If already has bullet on this line, append next bullet on a new line
      const insertText = '\n• ';
      newValue = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
      newCursorPos = selectionStart + insertText.length;
    } else if (!currentLine.trim()) {
      // Current line is blank: prefix with bullet
      newValue = value.slice(0, lineStart) + '• ' + value.slice(selectionStart);
      newCursorPos = lineStart + 2;
    } else {
      // Current line has text: insert new bullet line
      const insertText = '\n• ';
      newValue = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
      newCursorPos = selectionStart + insertText.length;
    }

    setOutcome(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    });
  };

  // Sort categories according to preferred sequence
  const sortedCategories = [...categories].sort((a, b) => {
    const ia = PREFERRED_CATEGORY_ORDER.indexOf(a.name);
    const ib = PREFERRED_CATEGORY_ORDER.indexOf(b.name);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  // Compute actual duration in minutes
  const computeDurationMinutes = (start: string, end: string): number => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startTotal = sh * 60 + sm;
      const endTotal = eh * 60 + em;
      return endTotal - startTotal;
    } catch {
      return 0;
    }
  };

  const durationMin = computeDurationMinutes(startTime, endTime);
  const durationFormatted =
    durationMin > 0
      ? `${Math.floor(durationMin / 60)}h ${(durationMin % 60).toString().padStart(2, '0')}m`
      : 'Invalid interval';

  // Initialize form state
  useEffect(() => {
    if (editingActivity) {
      setCategoryId(editingActivity.category_id);
      setTaskName(editingActivity.task_name);
      setTaskDescription(editingActivity.task_description || '');
      setOutcome(editingActivity.outcome || '');
      setPriority(editingActivity.priority);
      setStatus(editingActivity.status);
      setRemarks(editingActivity.remarks || '');
      setDependencies(editingActivity.dependencies || '');
      setDeviations(editingActivity.deviations || '');

      const parsedStart = formatTimeHHmm(editingActivity.start_time);
      const parsedEnd = formatTimeHHmm(editingActivity.end_time);
      if (parsedStart) setStartTime(parsedStart);
      if (parsedEnd) setEndTime(parsedEnd);

      if (editingActivity.outcome || editingActivity.remarks || editingActivity.task_description) {
        setShowOptionalDetails(true);
      }
    } else {
      if (sortedCategories.length > 0 && !categoryId) {
        setCategoryId(sortedCategories[0].id);
      }
      setTaskName('');
      setTaskDescription('');
      setOutcome('');
      setStartTime('09:00');
      setEndTime('11:00');
      setPriority('MEDIUM');
      setStatus('COMPLETED');
      setRemarks('');
      setDependencies('');
      setDeviations('');
      setShowOptionalDetails(false);
    }
    setErrorMsg('');
  }, [editingActivity, isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!categoryId) {
      setErrorMsg('Please select an activity category.');
      return;
    }
    if (!taskName.trim()) {
      setErrorMsg('Please enter a task name.');
      return;
    }
    if (durationMin <= 0) {
      setErrorMsg('End time must be strictly after start time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = `${targetDate}T${startTime}:00`;
      const endDateTime = `${targetDate}T${endTime}:00`;

      await onSave({
        category_id: categoryId,
        task_name: taskName.trim(),
        task_description: taskDescription.trim() || undefined,
        outcome: outcome.trim() || undefined,
        priority,
        status,
        planned_minutes: durationMin,
        start_time: startDateTime,
        end_time: endDateTime,
        actual_minutes: durationMin,
        remarks: remarks.trim() || undefined,
        dependencies: dependencies.trim() || undefined,
        deviations: deviations.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-base font-black text-slate-900">
              {editingActivity ? 'Edit Activity Entry' : 'Simple Activity Entry'}
            </h3>
            <p className="text-xs text-slate-500">
              Recording work for <span className="font-bold text-slate-800">{targetDate}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* STEP 1: Pick Category from Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                Pick Category <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">High-level activity bucket</span>
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-sm font-semibold rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              required
            >
              {sortedCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.activity_group})
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: Type Task Name Manually (Text Input) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                Type Task Name Manually <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">No predefined dropdowns</span>
            </div>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder='e.g., "Python OOP practice questions", "Section 6 doubt clearing", or "GRIT exam room 3 proctoring"'
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              required
              autoFocus
            />
          </div>

          {/* STEP 3: Enter Start Time & End Time */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                Enter Start Time & End Time
              </label>
              <span className="text-[11px] text-slate-500 font-medium">15-minute quick snaps</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Start Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={`start-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  End Time
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={`end-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto-calculated Duration Display */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Actual Duration:
              </span>
              <span
                className={`font-black font-mono text-xs px-2.5 py-1 rounded-lg border shadow-2xs ${
                  durationMin > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {durationFormatted} {durationMin > 0 ? `(${durationMin} mins)` : ''}
              </span>
            </div>
          </div>

          {/* Optional Details Collapsible Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                {showOptionalDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
                Optional Details (Outcome, Status, Remarks)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {showOptionalDetails ? 'Click to collapse' : 'Click to add optional details'}
              </span>
            </button>

            {showOptionalDetails && (
              <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Key Outcome / Deliverable
                      </label>
                      <button
                        type="button"
                        onClick={handleInsertBullet}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors border border-blue-200 cursor-pointer"
                        title="Add bullet point"
                      >
                        <List className="w-3 h-3" />
                        <span>+ Bullet</span>
                      </button>
                    </div>
                    <textarea
                      ref={outcomeTextareaRef}
                      rows={3}
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      onKeyDown={handleOutcomeKeyDown}
                      placeholder={`• Solved doubts for 6 learners\n• Guided on debugging\n(Press Enter for next bullet)`}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[64px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Task Description / Context
                    </label>
                    <input
                      type="text"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Detailed context or topics covered"
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Observations, dependencies, or deviations"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !taskName.trim() || durationMin <= 0}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : editingActivity ? 'Update Activity' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
