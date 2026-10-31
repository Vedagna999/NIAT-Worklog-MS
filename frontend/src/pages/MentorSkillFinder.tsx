import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Code2,
  Users,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  RotateCcw,
  Tag,
  GraduationCap,
  Award,
  HelpCircle,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import {
  SkillFinderSearchResponse,
  SkillFinderMentorResult,
  SkillFinderActivityItem,
  MentorRosterItem,
  EvidenceType,
  ManagerDashboardView
} from '../types';
import { formatTimeHHmm } from '../utils/formatTime';

const SUGGESTED_SKILLS = [
  'Python',
  'Node.js',
  'Git',
  'DSA',
  'Database',
  'Streamlit',
  'Pandas',
  'OOP',
  'Redis',
  'Architecture'
];

export const MentorSkillFinder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search input state
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState<string>(initialQuery);
  const [activeQuery, setActiveQuery] = useState<string>(initialQuery);

  // Filters state
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceType>(
    (searchParams.get('evidence_type') as EvidenceType) || 'all'
  );
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d' | 'custom'>(
    (searchParams.get('date_range') as any) || 'all'
  );
  const [customStartDate, setCustomStartDate] = useState<string>(searchParams.get('start_date') || '');
  const [customEndDate, setCustomEndDate] = useState<string>(searchParams.get('end_date') || '');
  const [selectedMentorFilter, setSelectedMentorFilter] = useState<string>(searchParams.get('mentor_id') || '');

  // Mentors roster for filter dropdown
  const [assignedMentors, setAssignedMentors] = useState<MentorRosterItem[]>([]);

  // Results state
  const [results, setResults] = useState<SkillFinderSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // View presentation mode: 'mentor' (grouped) vs 'flat' (all activities list)
  const [viewMode, setViewMode] = useState<'mentor' | 'flat'>('mentor');
  // Expanded mentor cards in grouped view
  const [expandedMentorIds, setExpandedMentorIds] = useState<Record<string, boolean>>({});

  // Quick Preview Modal state
  const [previewWorklog, setPreviewWorklog] = useState<{
    mentorId: string;
    mentorName: string;
    date: string;
    highlightActivityId: string;
  } | null>(null);
  const [previewData, setPreviewData] = useState<ManagerDashboardView | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Load assigned mentors on mount for the mentor filter dropdown
  useEffect(() => {
    async function fetchMentors() {
      try {
        const list = await api.getAssignedMentors();
        setAssignedMentors(list);
      } catch (err: any) {
        console.error('Failed to load mentors for filter:', err);
      }
    }
    fetchMentors();
  }, []);

  // Execute search if query is in URL params on mount
  useEffect(() => {
    if (initialQuery.trim()) {
      executeSearch(initialQuery.trim());
    }
  }, []);

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setErrorMsg('Please enter a skill or topic to search.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setActiveQuery(searchTerm.trim());

    // Update URL params
    const nextParams = new URLSearchParams();
    nextParams.set('q', searchTerm.trim());
    if (evidenceFilter !== 'all') nextParams.set('evidence_type', evidenceFilter);
    if (dateRangeFilter !== 'all') nextParams.set('date_range', dateRangeFilter);
    if (dateRangeFilter === 'custom') {
      if (customStartDate) nextParams.set('start_date', customStartDate);
      if (customEndDate) nextParams.set('end_date', customEndDate);
    }
    if (selectedMentorFilter) nextParams.set('mentor_id', selectedMentorFilter);
    setSearchParams(nextParams);

    try {
      const res = await api.searchMentorSkills({
        q: searchTerm.trim(),
        evidence_type: evidenceFilter,
        date_range: dateRangeFilter,
        start_date: dateRangeFilter === 'custom' ? customStartDate : undefined,
        end_date: dateRangeFilter === 'custom' ? customEndDate : undefined,
        mentor_id: selectedMentorFilter || undefined
      });
      setResults(res);

      // Auto-expand all matching mentors initially
      const initExpanded: Record<string, boolean> = {};
      res.mentors.forEach((m) => {
        initExpanded[m.mentor_id] = true;
      });
      setExpandedMentorIds(initExpanded);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to search mentor skills.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestedClick = (skill: string) => {
    setQuery(skill);
    executeSearch(skill);
  };

  const toggleMentorExpand = (mentorId: string) => {
    setExpandedMentorIds((prev) => ({
      ...prev,
      [mentorId]: !prev[mentorId]
    }));
  };

  // Quick Preview modal handler
  const openQuickPreview = async (
    mentorId: string,
    mentorName: string,
    dateStr: string,
    activityId: string
  ) => {
    setPreviewWorklog({
      mentorId,
      mentorName,
      date: dateStr,
      highlightActivityId: activityId
    });
    setIsPreviewLoading(true);
    try {
      const data = await api.getManagerDashboard(mentorId, dateStr);
      setPreviewData(data);
    } catch (err: any) {
      console.error('Failed to load daily worklog preview:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closeQuickPreview = () => {
    setPreviewWorklog(null);
    setPreviewData(null);
  };

  const navigateToFullWorklog = (mentorId: string, dateStr: string, activityId: string) => {
    navigate(
      `/manager/worklogs?mentor_id=${mentorId}&date=${dateStr}&highlight_activity=${activityId}&from_skill_finder=true&skill_query=${encodeURIComponent(
        activeQuery
      )}`
    );
  };

  // Evidence badge helper
  const getEvidenceBadge = (type: string) => {
    switch (type) {
      case 'LEARNING':
        return {
          icon: <BookOpen className="w-3 h-3 text-blue-600" />,
          label: 'Learning Recorded',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'PRACTICE':
        return {
          icon: <Code2 className="w-3 h-3 text-emerald-600" />,
          label: 'Practice Recorded',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'TEACHING_EXPERIENCE':
        return {
          icon: <Users className="w-3 h-3 text-purple-600" />,
          label: 'Teaching/Experience Recorded',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      case 'RELATED':
      default:
        return {
          icon: <Tag className="w-3 h-3 text-slate-500" />,
          label: 'Related Activity Recorded',
          badgeClass: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  // Highlight search term in text
  const renderHighlightedText = (text: string, term: string) => {
    if (!text) return null;
    if (!term) return <span>{text}</span>;

    const regex = new RegExp(`(${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 text-amber-900 px-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header Section */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Manager Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Mentor Skill Finder
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Find mentors by their recorded learning topics, practical coding exercises, and teaching experience.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              to="/manager"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              Manager Portal
            </Link>
            <Link
              to="/reports"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              Reports
            </Link>
          </div>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="mt-6">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a skill or topic, e.g. Python, Node.js, Redis..."
              className="w-full pl-12 pr-28 py-3.5 bg-slate-800/90 text-white placeholder-slate-400 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-24 text-slate-400 hover:text-white transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-500" /> Popular:
          </span>
          {SUGGESTED_SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => handleSuggestedClick(skill)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all font-mono text-[11px]"
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Filters:
            </div>

            {/* Evidence Type Filter */}
            <div className="flex items-center gap-1">
              <select
                value={evidenceFilter}
                onChange={(e) => {
                  const val = e.target.value as EvidenceType;
                  setEvidenceFilter(val);
                  if (activeQuery) {
                    executeSearch(activeQuery);
                  }
                }}
                className="bg-slate-50 text-slate-800 text-xs font-medium rounded-xl border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Evidence Types</option>
                <option value="LEARNING">🎓 Learning Recorded</option>
                <option value="PRACTICE">💻 Practice Recorded</option>
                <option value="TEACHING_EXPERIENCE">👥 Teaching/Experience Recorded</option>
                <option value="RELATED">🔖 Related Activity Recorded</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1">
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setDateRangeFilter(val);
                  if (activeQuery && val !== 'custom') {
                    executeSearch(activeQuery);
                  }
                }}
                className="bg-slate-50 text-slate-800 text-xs font-medium rounded-xl border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {dateRangeFilter === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-300 text-xs">
                <span className="text-slate-500 text-[11px]">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800"
                />
                <span className="text-slate-500 text-[11px]">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => executeSearch(activeQuery || query)}
                  className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-500"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Mentor Filter Dropdown (Restricted to assigned mentors) */}
            <div className="flex items-center gap-1">
              <select
                value={selectedMentorFilter}
                onChange={(e) => {
                  setSelectedMentorFilter(e.target.value);
                  if (activeQuery) {
                    executeSearch(activeQuery);
                  }
                }}
                className="bg-slate-50 text-slate-800 text-xs font-medium rounded-xl border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
              >
                <option value="">All Assigned Mentors ({assignedMentors.length})</option>
                {assignedMentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Toggle */}
          {results && results.mentors.length > 0 && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 self-start md:self-auto text-xs">
              <button
                type="button"
                onClick={() => setViewMode('mentor')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  viewMode === 'mentor'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grouped by Mentor
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  viewMode === 'flat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activity Stream
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Search Results Summary Metrics Bar */}
      {results && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Search Results for:
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-bold">
                  "{results.query}"
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Found{' '}
                <strong className="text-slate-900 font-bold">
                  {results.total_matching_mentors} {results.total_matching_mentors === 1 ? 'Mentor' : 'Mentors'}
                </strong>{' '}
                with{' '}
                <strong className="text-slate-900 font-bold">
                  {results.total_matching_activities}{' '}
                  {results.total_matching_activities === 1 ? 'matching activity' : 'matching activities'}
                </strong>{' '}
                recording a total of{' '}
                <strong className="text-blue-900 font-bold">{results.total_recorded_hours}</strong> of relevant time.
              </p>
            </div>

            {/* Evidence counts breakdown badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {results.evidence_counts['LEARNING'] > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 font-semibold flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-blue-600" />
                  {results.evidence_counts['LEARNING']} Learning
                </span>
              )}
              {results.evidence_counts['PRACTICE'] > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-emerald-600" />
                  {results.evidence_counts['PRACTICE']} Practice
                </span>
              )}
              {results.evidence_counts['TEACHING_EXPERIENCE'] > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-600" />
                  {results.evidence_counts['TEACHING_EXPERIENCE']} Teaching/Exp
                </span>
              )}
              {results.evidence_counts['RELATED'] > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 border border-slate-300 font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-600" />
                  {results.evidence_counts['RELATED']} Related
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Results List / Empty / Initial States */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-16 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : !results ? (
        /* Initial Screen */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Discover Mentor Capabilities</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Search for any technology, framework, or concept to see which of your assigned mentors have studied it, practiced it, or taught it to students.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {SUGGESTED_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => handleSuggestedClick(skill)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-xs font-semibold transition-all"
              >
                + Search "{skill}"
              </button>
            ))}
          </div>
        </div>
      ) : results.mentors.length === 0 ? (
        /* No Results Found Screen */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            No mentors with recorded activity matching this topic were found in your assigned team for the selected period.
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try searching for related keywords, adjusting the evidence type filter, or broadening the date range to "All Time".
          </p>
          <button
            type="button"
            onClick={() => {
              setEvidenceFilter('all');
              setDateRangeFilter('all');
              setSelectedMentorFilter('');
              executeSearch(results.query);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters & Re-search
          </button>
        </div>
      ) : viewMode === 'mentor' ? (
        /* Grouped by Mentor View */
        <div className="space-y-6">
          {results.mentors.map((mentor) => {
            const isExpanded = !!expandedMentorIds[mentor.mentor_id];
            const initials = mentor.mentor_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            return (
              <div
                key={mentor.mentor_id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Mentor Card Header */}
                <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-800 text-white font-black text-lg flex items-center justify-center shadow-md">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{mentor.mentor_name}</h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold font-mono">
                          {mentor.mentor_email}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>
                          Assigned to: <strong>{mentor.manager_name || 'Your Team'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Most Recent:{' '}
                          <strong className="text-slate-800 font-semibold">
                            {mentor.most_recent_activity_formatted || '—'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Badges & Toggle */}
                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-blue-900">
                        {mentor.total_relevant_hours}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {mentor.total_matching_activities}{' '}
                        {mentor.total_matching_activities === 1 ? 'activity' : 'activities'}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMentorExpand(mentor.mentor_id)}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                      title={isExpanded ? 'Collapse activities' : 'Expand activities'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Evidence Types Present in this Mentor */}
                <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Evidence Found:</span>
                    {mentor.evidence_types_present.map((etype) => {
                      const badge = getEvidenceBadge(etype);
                      return (
                        <span
                          key={etype}
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1 ${badge.badgeClass}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-slate-500 italic">
                    All durations reflect verified non-overlapping time records.
                  </span>
                </div>

                {/* Activities List (Accordion Content) */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {mentor.activities.map((act) => {
                      const badge = getEvidenceBadge(act.evidence_type);

                      return (
                        <div
                          key={act.id}
                          className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                        >
                          {/* Activity Details Left */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Evidence Badge */}
                              <span
                                className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${badge.badgeClass}`}
                                title={act.evidence_note}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>

                              {/* Category Badge */}
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                                {act.category_name}
                              </span>

                              {/* Date & Time */}
                              <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-semibold text-slate-700">{act.formatted_date}</span>
                                <span className="mx-1">•</span>
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {act.start_time_formatted} - {act.end_time_formatted} ({act.duration_formatted})
                                </span>
                              </div>
                            </div>

                            {/* Task Title */}
                            <h3 className="text-base font-bold text-slate-900">
                              {renderHighlightedText(act.task_name, activeQuery)}
                            </h3>

                            {/* Recorded Outcome */}
                            {act.outcome && (
                              <div className="text-xs bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-800 space-y-1">
                                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                  Recorded Outcome:
                                </div>
                                <div className="text-slate-800 font-medium">
                                  {renderHighlightedText(act.outcome, activeQuery)}
                                </div>
                              </div>
                            )}

                            {/* Classification Context Note */}
                            <p className="text-[11px] text-slate-500 italic flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-slate-400" />
                              {act.evidence_note}
                            </p>
                          </div>

                          {/* Action Buttons Right */}
                          <div className="flex md:flex-col items-center gap-2 self-start md:self-stretch justify-center flex-shrink-0">
                            {/* View Full Daily Worklog in Manager Portal */}
                            <button
                              onClick={() =>
                                navigateToFullWorklog(mentor.mentor_id, act.work_date, act.id)
                              }
                              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                              title="Open original worklog on Manager Dashboard with this activity highlighted"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Worklog
                            </button>

                            {/* Quick Preview Modal Button */}
                            <button
                              onClick={() =>
                                openQuickPreview(mentor.mentor_id, mentor.mentor_name, act.work_date, act.id)
                              }
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                              title="Preview entire day's worklog in overlay"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              Quick Preview
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Activity Stream View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              All Matching Activities ({results.total_matching_activities})
            </h2>
            <span className="text-xs text-slate-500">Sorted by most recent activity date</span>
          </div>

          <div className="divide-y divide-slate-100">
            {results.mentors
              .flatMap((m) =>
                m.activities.map((a) => ({
                  ...a,
                  mentor_name: m.mentor_name,
                  mentor_id: m.mentor_id
                }))
              )
              .sort((a, b) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime())
              .map((act) => {
                const badge = getEvidenceBadge(act.evidence_type);

                return (
                  <div
                    key={act.id}
                    className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{act.mentor_name}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-700">{act.formatted_date}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-800">
                          {act.duration_formatted}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-slate-900">
                        {renderHighlightedText(act.task_name, activeQuery)}
                      </div>

                      {act.outcome && (
                        <div className="text-xs text-slate-600 line-clamp-2">
                          <strong className="text-slate-700">Outcome:</strong>{' '}
                          {renderHighlightedText(act.outcome, activeQuery)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          navigateToFullWorklog(act.mentor_id, act.work_date, act.id)
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Worklog
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 5. Quick Preview Worklog Modal */}
      {previewWorklog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Original Daily Worklog Preview
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {previewWorklog.mentorName} • {previewWorklog.date}
                </h3>
              </div>
              <button
                onClick={closeQuickPreview}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isPreviewLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Loading daily worklog details...</p>
                </div>
              ) : previewData?.worklog ? (
                <>
                  {/* Daily Target Progress Bar */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Daily Working Hours</div>
                      <div className="text-lg font-extrabold text-slate-900">
                        {Math.floor((previewData.worklog.total_actual_minutes || 0) / 60)}h{' '}
                        {((previewData.worklog.total_actual_minutes || 0) % 60).toString().padStart(2, '0')}m / 6h 00m
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {previewData.worklog.is_target_achieved ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Target Met (≥ 6h)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          Under Target (&lt; 6h)
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase font-mono">
                        {previewData.worklog.status}
                      </span>
                    </div>
                  </div>

                  {/* All Activities on this date */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      All Recorded Activities on this Date ({previewData.worklog.activities?.length || 0})
                    </h4>
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
                      {previewData.worklog.activities?.map((act) => {
                        const isHighlighted = act.id === previewWorklog.highlightActivityId;

                        return (
                          <div
                            key={act.id}
                            className={`p-4 transition-colors ${
                              isHighlighted
                                ? 'bg-amber-50/80 border-l-4 border-l-amber-500 ring-1 ring-amber-300'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-800">
                                  {formatTimeHHmm(act.start_time)} - {formatTimeHHmm(act.end_time)}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                  {act.category?.name || 'General'}
                                </span>
                                {isHighlighted && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                    <Sparkles className="w-3 h-3 text-amber-700" />
                                    Matching Skill
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-900">
                                {Math.floor(act.actual_minutes / 60)}h{' '}
                                {(act.actual_minutes % 60).toString().padStart(2, '0')}m
                              </span>
                            </div>

                            <div className="text-sm font-bold text-slate-900 mt-1">{act.task_name}</div>
                            {act.outcome && (
                              <p className="text-xs text-slate-600 mt-0.5">
                                <strong className="text-slate-700">Outcome:</strong> {act.outcome}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Worklog details could not be loaded.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={closeQuickPreview}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={() => {
                  navigateToFullWorklog(
                    previewWorklog.mentorId,
                    previewWorklog.date,
                    previewWorklog.highlightActivityId
                  );
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-xs"
              >
                Open in Full Manager Portal →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
