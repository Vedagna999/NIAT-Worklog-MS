import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  List,
  Sparkles,
  Award
} from 'lucide-react';
import { Category, TaskTemplate, Activity, TaskPriority, TaskStatus, MentorSkill, SkillCategoryType, SkillStatus } from '../types';
import { formatTimeHHmm } from '../utils/formatTime';
import { api } from '../services/api';
import { StarRating } from './StarRating';

interface QuickActivityEntryProps {
  categories: Category[];
  taskTemplates?: Record<string, TaskTemplate[]>;
  onSave: (activityData: any) => Promise<void>;
  editingActivity?: Activity | null;
  onCancelEdit?: () => void;
  targetDate: string; // YYYY-MM-DD
  existingActivities?: Activity[];
  isLocked?: boolean;
}

// 15-minute intervals helpers (08:00 to 22:00)
const TIME_OPTIONS: string[] = [];
for (let h = 8; h <= 21; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}
TIME_OPTIONS.push('22:00');

export const QuickActivityEntry: React.FC<QuickActivityEntryProps> = ({
  categories,
  taskTemplates = {},
  onSave,
  editingActivity,
  onCancelEdit,
  targetDate,
  existingActivities = [],
  isLocked = false,
}) => {
  // Expandable state: false by default for a compact single-row footprint
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('');
  const [learningTopic, setLearningTopic] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [outcome, setOutcome] = useState<string>('');

  // Collapsible optional details inside form
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('COMPLETED');
  const [remarks, setRemarks] = useState<string>('');

  // Skill Upskilling Integration State
  const [mentorSkills, setMentorSkills] = useState<MentorSkill[]>([]);
  const [enableUpskill, setEnableUpskill] = useState<boolean>(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategoryType>('TECHNICAL');
  const [upskillRating, setUpskillRating] = useState<number>(3.0);
  const [upskillStatus, setUpskillStatus] = useState<SkillStatus>('CURRENTLY_LEARNING');
  const [upskillNotes, setUpskillNotes] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Ref and smart handlers for outcome multiline and bullet points
  const outcomeTextareaRef = React.useRef<HTMLTextAreaElement>(null);

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

  // Set default category on mount
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Selected category object
  const currentCategory = categories.find((c) => c.id === categoryId);
  const isLearningCategory =
    currentCategory?.activity_group === 'LEARNING' ||
    currentCategory?.name.includes('Learning');

  // Load mentor skills
  useEffect(() => {
    async function loadSkills() {
      try {
        const profile = await api.getMySkills();
        setMentorSkills(profile.skills || []);
        if (profile.skills && profile.skills.length > 0 && !selectedSkillId) {
          setSelectedSkillId(profile.skills[0].id);
          setUpskillRating(profile.skills[0].confidence_rating);
          setUpskillStatus(profile.skills[0].status);
        }
      } catch (e) {
        // quiet fallback
      }
    }
    loadSkills();
  }, []);

  // When selectedSkillId changes, sync the current rating
  const handleSkillSelect = (id: string) => {
    setSelectedSkillId(id);
    if (id !== '__NEW__') {
      const match = mentorSkills.find((s) => s.id === id);
      if (match) {
        setUpskillRating(match.confidence_rating);
        setUpskillStatus(match.status);
      }
    } else {
      setUpskillRating(3.0);
      setUpskillStatus('CURRENTLY_LEARNING');
    }
  };

  // Templates for the selected category
  const categoryTemplates = currentCategory?.name
    ? taskTemplates[currentCategory.name] || []
    : [];

  // Duration calculation
  const computeDurationMinutes = (start: string, end: string): number => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return eh * 60 + em - (sh * 60 + sm);
    } catch {
      return 0;
    }
  };

  const durationMin = computeDurationMinutes(startTime, endTime);
  const durationFormatted =
    durationMin > 0
      ? `${Math.floor(durationMin / 60)}h ${(durationMin % 60).toString().padStart(2, '0')}m`
      : 'Invalid';

  // Check for client-side overlap with existing activities
  const checkOverlap = (sTimeStr: string, eTimeStr: string): Activity | null => {
    const sMin = computeDurationMinutes('00:00', sTimeStr);
    const eMin = computeDurationMinutes('00:00', eTimeStr);
    if (sMin >= eMin) return null;

    for (const act of existingActivities) {
      if (editingActivity && act.id === editingActivity.id) continue;
      const actStart = formatTimeHHmm(act.start_time);
      const actEnd = formatTimeHHmm(act.end_time);
      if (!actStart || !actEnd) continue;
      const actSMin = computeDurationMinutes('00:00', actStart);
      const actEMin = computeDurationMinutes('00:00', actEnd);

      // Overlap condition: sMin < actEMin && eMin > actSMin
      if (sMin < actEMin && eMin > actSMin) {
        return act;
      }
    }
    return null;
  };

  const overlappingActivity = checkOverlap(startTime, endTime);

  // When editingActivity changes, populate and automatically expand
  useEffect(() => {
    if (editingActivity) {
      setIsExpanded(true);
      setCategoryId(editingActivity.category_id);
      setTaskName(editingActivity.task_name);
      setOutcome(editingActivity.outcome || '');
      setPriority(editingActivity.priority);
      setStatus(editingActivity.status);
      setRemarks(editingActivity.remarks || '');

      const parsedStart = formatTimeHHmm(editingActivity.start_time);
      const parsedEnd = formatTimeHHmm(editingActivity.end_time);
      if (parsedStart) setStartTime(parsedStart);
      if (parsedEnd) setEndTime(parsedEnd);

      setSelectedTemplateName('');
      if (editingActivity.remarks) setShowMoreDetails(true);
    } else {
      setTaskName('');
      setSelectedTemplateName('');
      setLearningTopic('');
      setOutcome('');
      setRemarks('');
      setPriority('MEDIUM');
      setStatus('COMPLETED');
      setShowMoreDetails(false);
    }
    setErrorMsg('');
  }, [editingActivity]);

  // Handle template selection
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTemplateName(val);
    if (!val) return;

    const tmpl = categoryTemplates.find((t) => t.name === val);
    if (tmpl) {
      setTaskName(tmpl.name);
      if (tmpl.outcome && !outcome) {
        setOutcome(tmpl.outcome);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isLocked) {
      setErrorMsg('This daily worklog is locked and cannot be modified.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Please select an activity category.');
      return;
    }
    if (!taskName.trim()) {
      setErrorMsg('Please enter an activity name or select a template.');
      return;
    }
    if (durationMin <= 0) {
      setErrorMsg('End time must be strictly after start time.');
      return;
    }
    if (overlappingActivity) {
      const actStart = formatTimeHHmm(overlappingActivity.start_time);
      const actEnd = formatTimeHHmm(overlappingActivity.end_time);
      setErrorMsg(
        `Time interval overlaps with existing task '${overlappingActivity.task_name}' (${actStart} - ${actEnd}). Please select a different time slot.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = `${targetDate}T${startTime}:00`;
      const endDateTime = `${targetDate}T${endTime}:00`;

      let upskillData = undefined;
      if (enableUpskill) {
        if (selectedSkillId === '__NEW__') {
          if (newSkillName.trim()) {
            upskillData = {
              skill_name: newSkillName.trim(),
              category_type: newSkillCategory,
              confidence_rating: upskillRating,
              status: upskillStatus,
              notes: upskillNotes.trim() || outcome.trim() || undefined,
            };
          }
        } else if (selectedSkillId) {
          upskillData = {
            skill_id: selectedSkillId,
            confidence_rating: upskillRating,
            status: upskillStatus,
            notes: upskillNotes.trim() || outcome.trim() || undefined,
          };
        }
      }

      await onSave({
        category_id: categoryId,
        task_name: taskName.trim(),
        task_description:
          isLearningCategory && learningTopic.trim()
            ? learningTopic.trim()
            : taskName.trim(),
        outcome: outcome.trim() || undefined,
        priority,
        status,
        planned_minutes: durationMin,
        start_time: startDateTime,
        end_time: endDateTime,
        actual_minutes: durationMin,
        remarks: remarks.trim() || undefined,
        upskillData,
      });

      // Reset form and collapse back after successful submission
      setTaskName('');
      setSelectedTemplateName('');
      setLearningTopic('');
      setOutcome('');
      setRemarks('');
      setEnableUpskill(false);
      setNewSkillName('');
      setUpskillNotes('');
      setShowMoreDetails(false);
      setIsExpanded(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLocked) {
    return null;
  }

  // ==========================================================
  // COMPACT COLLAPSED STATE: Simple bar with '+' symbol and title
  // ==========================================================
  if (!isExpanded) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden hover:border-blue-300 transition-all">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Quick Activity Entry
              </h3>
              <p className="text-[11px] text-slate-500">
                Click here to log a task, mentoring session, or learning hours
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Activity</span>
          </div>
        </button>
      </div>
    );
  }

  // ==========================================================
  // EXPANDED STATE: Full Easy-to-Scan Form
  // ==========================================================
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {editingActivity ? 'Edit Recorded Activity' : 'Quick Activity Entry'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Select category, optional template or title, pick times, and save.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editingActivity ? (
            <button
              type="button"
              onClick={() => {
                onCancelEdit?.();
                setIsExpanded(false);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
              Cancel Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Collapse form"
            >
              <ChevronUp className="w-4 h-4" />
              <span>Collapse</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Overlap Real-time Warning */}
      {overlappingActivity && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Time Overlap Detected:</strong> Conflicts with existing entry{' '}
            <em>'{overlappingActivity.task_name}'</em> (
            {formatTimeHHmm(overlappingActivity.start_time)} -{' '}
            {formatTimeHHmm(overlappingActivity.end_time)}).
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Row 1: Category & Category-Dependent Quick Template Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSelectedTemplateName('');
              }}
              className="w-full text-xs font-semibold rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category-Dependent Activity Shortcut Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quick Task Template <span className="text-slate-400 font-normal">(Optional Shortcut)</span>
            </label>
            <select
              value={selectedTemplateName}
              onChange={handleTemplateChange}
              className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="">Select a common activity template or type below...</option>
              {categoryTemplates.map((tmpl, idx) => (
                <option key={idx} value={tmpl.name}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Task Name (Free-form / Auto-populated) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Activity Name / Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder={
              isLearningCategory
                ? 'e.g., Python OOP practice questions, FastAPI microservices, Redis caching'
                : 'e.g., 1-on-1 Student Doubt Clearing Session, GRIT Exam Room 3 Proctoring'
            }
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            required
          />
        </div>

        {/* Optional Learning Topic field (Only for learning activities) */}
        {isLearningCategory && (
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 space-y-1">
            <label className="block text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-700" />
              Learning Subject / Concept Note <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={learningTopic}
              onChange={(e) => setLearningTopic(e.target.value)}
              placeholder="e.g. Asynchronous coroutines, database index profiling, React 19 server actions"
              className="w-full text-xs rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        )}

        {/* Row 3: Start Time, End Time & Auto-Calculated Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Start Time (15m snaps)
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`st-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              End Time (15m snaps)
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`et-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Auto Duration Callout */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-1">Duration</div>
            <div
              className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border flex items-center justify-between ${
                durationMin > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {durationFormatted}
              </span>
              {durationMin > 0 && <span className="text-[10px] text-blue-600 font-normal">Auto</span>}
            </div>
          </div>
        </div>

        {/* Row 4: Short Outcome Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Short Outcome / Tangible Result{' '}
              <span className="text-slate-400 font-normal">(Brief summary or bullet points)</span>
            </label>
            <button
              type="button"
              onClick={handleInsertBullet}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors border border-blue-200 cursor-pointer shadow-2xs"
              title="Add bullet point (Press Enter to continue bullets on new line)"
            >
              <List className="w-3.5 h-3.5" />
              <span>+ Bullet</span>
            </button>
          </div>
          <textarea
            ref={outcomeTextareaRef}
            rows={3}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            onKeyDown={handleOutcomeKeyDown}
            placeholder={`• Solved 6 student blocker tickets on loops\n• Guided 4 learners on Postman testing\n(Press Enter for a new line or next bullet)`}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs resize-y min-h-[72px]"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 font-mono text-[10px]">Enter</kbd> for a new line or next bullet</span>
            <span>Enter on empty bullet clears it</span>
          </div>
        </div>

        {/* Collapsible Details (Status, Priority, Remarks) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showMoreDetails ? 'Hide Extra Fields' : '+ Add Status, Priority & Remarks (Optional)'}</span>
          </button>

          {showMoreDetails && (
            <div className="mt-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900"
                >
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes / deviations"
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Skill Upskilling Integration Section */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableUpskill}
                onChange={(e) => setEnableUpskill(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Link to Skill & Record Upskilling Milestone
              </span>
            </label>
            <span className="text-[10px] text-indigo-600 font-medium bg-indigo-100/80 px-2 py-0.5 rounded-full">
              Growth History
            </span>
          </div>

          {enableUpskill && (
            <div className="pt-2 border-t border-indigo-100 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Skill Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Skill
                  </label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => handleSkillSelect(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {mentorSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.skill_name} ({s.confidence_rating}★ - {s.category_type})
                      </option>
                    ))}
                    <option value="__NEW__">+ Add Newly Learned Skill...</option>
                  </select>
                </div>

                {/* If New Skill, enter name and category */}
                {selectedSkillId === '__NEW__' ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        New Skill Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Next.js, Docker, MongoDB"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Category
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewSkillCategory('TECHNICAL')}
                          className={`text-xs py-1 px-2.5 rounded border ${
                            newSkillCategory === 'TECHNICAL'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          Technical
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewSkillCategory('NON_TECHNICAL')}
                          className={`text-xs py-1 px-2.5 rounded border ${
                            newSkillCategory === 'NON_TECHNICAL'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          Non-Technical
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Learning Status
                    </label>
                    <select
                      value={upskillStatus}
                      onChange={(e) => setUpskillStatus(e.target.value as SkillStatus)}
                      className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900"
                    >
                      <option value="CURRENTLY_LEARNING">Currently Learning</option>
                      <option value="FAMILIAR">Familiar</option>
                      <option value="PROFICIENT">Proficient</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Confidence Rating Picker */}
              <div className="bg-white p-3 rounded-lg border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-slate-800">
                    Self-Assessed Confidence
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Update confidence for this skill (0.5 to 5.0 stars)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating
                    value={upskillRating}
                    onChange={(r) => setUpskillRating(r)}
                    interactive={true}
                    size="md"
                    showLabel={true}
                  />
                </div>
              </div>

              {/* Description of What was Learned */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Brief Description of What You Learned{' '}
                  <span className="text-slate-400 font-normal">(Leave empty to use activity outcome)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mastered async/await syntax, error propagation and Promise.all"
                  value={upskillNotes}
                  onChange={(e) => setUpskillNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              if (editingActivity) onCancelEdit?.();
              setIsExpanded(false);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !taskName.trim() || durationMin <= 0 || !!overlappingActivity}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isSubmitting
              ? 'Saving...'
              : editingActivity
              ? 'Update Activity'
              : '+ Add Activity'}
          </button>
        </div>
      </form>
    </div>
  );
};
