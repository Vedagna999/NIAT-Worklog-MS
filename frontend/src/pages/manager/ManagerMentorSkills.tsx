import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import {
  ManagerMentorSkillsView,
  MentorRosterItem,
  MentorSkill,
  RecentlyUpskilledItem,
  SkillGrowthTimeline
} from '../../types';
import { StarRating } from '../../components/StarRating';

export const ManagerMentorSkills: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const paramMentorId = searchParams.get('mentor_id');
  const [mentors, setMentors] = useState<MentorRosterItem[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>(
    paramMentorId || sessionStorage.getItem('niat_selected_mentor') || ''
  );

  const [skillsData, setSkillsData] = useState<ManagerMentorSkillsView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Active sub-tab inside the Skills & Growth view
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RECENT' | 'TIMELINE'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'TECHNICAL' | 'NON_TECHNICAL' | 'LEARNING'>('ALL');

  // 1. Fetch assigned mentors
  useEffect(() => {
    async function loadMentors() {
      try {
        const list = await api.getAssignedMentors();
        setMentors(list);
        if (list.length > 0) {
          if (paramMentorId && list.some((m) => m.id === paramMentorId)) {
            setSelectedMentorId(paramMentorId);
          } else if (!selectedMentorId || !list.some((m) => m.id === selectedMentorId)) {
            setSelectedMentorId(list[0].id);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load assigned mentors.');
      }
    }
    loadMentors();
  }, [paramMentorId]);

  // 2. Fetch skills dashboard whenever mentor changes
  const fetchSkillsData = async (mId: string) => {
    if (!mId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getMentorSkillsForManager(mId);
      setSkillsData(data);
      sessionStorage.setItem('niat_selected_mentor', mId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load mentor skills data.');
      setSkillsData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMentorId) {
      fetchSkillsData(selectedMentorId);
      setSearchParams({ mentor_id: selectedMentorId });
    }
  }, [selectedMentorId]);

  const selectedMentorObj = mentors.find((m) => m.id === selectedMentorId);

  // Filter skills for Overview tab
  const filteredSkills = (skillsData?.skills || []).filter((s) => {
    if (categoryFilter === 'TECHNICAL' && s.category_type !== 'TECHNICAL') return false;
    if (categoryFilter === 'NON_TECHNICAL' && s.category_type !== 'NON_TECHNICAL') return false;
    if (categoryFilter === 'LEARNING' && s.status !== 'CURRENTLY_LEARNING') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return s.skill_name.toLowerCase().includes(q) || (s.notes?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Mentor Selector */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Mentor Skills & Growth Platform
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {skillsData?.mentor_name || selectedMentorObj?.full_name || 'Mentor Skills'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Inspect self-assessed confidence, upskilling milestones, growth trajectories, and daily worklog evidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Select Mentor:</span>
              <select
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
              >
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Links */}
            <Link
              to={`/manager/worklogs?mentor_id=${selectedMentorId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Daily Worklogs
            </Link>
            <Link
              to={`/manager/insights?mentor_id=${selectedMentorId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Performance Analytics
            </Link>
          </div>
        </div>

        {/* Disclaimer Tag */}
        <div className="inline-flex items-center space-x-2 text-xs text-amber-200/90 bg-amber-950/40 border border-amber-800/50 px-3 py-1.5 rounded-lg">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            Ratings displayed are <strong>Self-Assessed Confidence (0.5 to 5.0 stars)</strong>, indicating personal comfort and upskilling progress rather than administrative ratings.
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && !skillsData ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading mentor skills dashboard...</p>
          </div>
        </div>
      ) : skillsData ? (
        <div className="space-y-6">
          {/* 2. Top Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Total Skills</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">{skillsData.summary.total_skills}</span>
                <span className="text-xs text-slate-500">profile skills</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-amber-600 text-xs font-bold uppercase tracking-wider">
                <span>Avg Confidence</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-900">
                  {skillsData.summary.average_confidence > 0
                    ? skillsData.summary.average_confidence.toFixed(1)
                    : '—'}
                </span>
                <span className="text-xs text-slate-500">/ 5.0 stars</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-blue-600 text-xs font-bold uppercase tracking-wider">
                <span>Currently Learning</span>
                <BookOpen className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-blue-900">
                  {skillsData.summary.currently_learning_count}
                </span>
                <span className="text-xs text-slate-500">active upskilling</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600 text-xs font-bold uppercase tracking-wider">
                <span>Technical Skills</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-900">
                  {skillsData.summary.technical_skills_count}
                </span>
                <span className="text-xs text-slate-500">languages & tools</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-purple-600 text-xs font-bold uppercase tracking-wider">
                <span>Non-Technical</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-purple-900">
                  {skillsData.summary.non_technical_skills_count}
                </span>
                <span className="text-xs text-slate-500">mentoring skills</span>
              </div>
            </div>
          </div>

          {/* 3. Section Navigation Tabs */}
          <div className="flex items-center border-b border-slate-200 space-x-6">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-3 text-sm font-bold tracking-tight transition-all relative ${
                activeTab === 'OVERVIEW'
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              A. Mentor Skills Overview ({skillsData.skills.length})
            </button>
            <button
              onClick={() => setActiveTab('RECENT')}
              className={`pb-3 text-sm font-bold tracking-tight transition-all relative ${
                activeTab === 'RECENT'
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              B. Recently Upskilled ({skillsData.recently_upskilled.length})
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`pb-3 text-sm font-bold tracking-tight transition-all relative ${
                activeTab === 'TIMELINE'
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              C. Skill Growth Timeline ({skillsData.growth_timelines.length})
            </button>
          </div>

          {/* TAB CONTENT A: Skills Overview */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* Filter controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCategoryFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      categoryFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Skills ({skillsData.skills.length})
                  </button>
                  <button
                    onClick={() => setCategoryFilter('TECHNICAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      categoryFilter === 'TECHNICAL'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Technical ({skillsData.summary.technical_skills_count})
                  </button>
                  <button
                    onClick={() => setCategoryFilter('NON_TECHNICAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      categoryFilter === 'NON_TECHNICAL'
                        ? 'bg-purple-700 text-white'
                        : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    Non-Technical ({skillsData.summary.non_technical_skills_count})
                  </button>
                  <button
                    onClick={() => setCategoryFilter('LEARNING')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      categoryFilter === 'LEARNING'
                        ? 'bg-blue-700 text-white'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    Currently Learning ({skillsData.summary.currently_learning_count})
                  </button>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search mentor's skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Grid of skills */}
              {filteredSkills.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                  No skills match the selected filter criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                skill.category_type === 'TECHNICAL'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {skill.category_type === 'TECHNICAL' ? 'Technical' : 'Non-Technical'}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">
                              {skill.skill_name}
                            </h3>
                          </div>

                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                              skill.status === 'CURRENTLY_LEARNING'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : skill.status === 'PROFICIENT'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {skill.status === 'CURRENTLY_LEARNING'
                              ? 'Currently Learning'
                              : skill.status === 'PROFICIENT'
                              ? 'Proficient'
                              : 'Familiar'}
                          </span>
                        </div>

                        {/* Star Rating */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Self-Assessed Confidence
                          </div>
                          <StarRating value={skill.confidence_rating} size="md" showLabel={true} />
                        </div>

                        {skill.notes ? (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {skill.notes}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No notes provided.</p>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Last updated: {skill.last_updated_formatted}</span>
                        </div>
                        <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {skill.growth_count} updates
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT B: Recently Upskilled */}
          {activeTab === 'RECENT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <p>
                  Newly acquired or updated skills in chronological order (newest first) with daily worklog evidence.
                </p>
                <span className="font-semibold text-slate-700">
                  {skillsData.recently_upskilled.length} upskilling events recorded
                </span>
              </div>

              {skillsData.recently_upskilled.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                  No recently upskilled records found for this mentor.
                </div>
              ) : (
                <div className="space-y-3">
                  {skillsData.recently_upskilled.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{item.skill_name}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              item.category_type === 'TECHNICAL'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {item.category_type}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            • {item.formatted_date}
                          </span>
                        </div>

                        {/* Progression Badge */}
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {item.previous_rating !== null && item.previous_rating !== undefined
                              ? `${item.previous_rating.toFixed(1)} ★ → ${item.current_rating.toFixed(1)} ★`
                              : `${item.current_rating.toFixed(1)} ★ (Baseline)`}
                          </span>
                          {item.status && (
                            <span className="text-slate-600 italic">
                              ({item.status === 'CURRENTLY_LEARNING' ? 'Learning' : 'Familiar'})
                            </span>
                          )}
                        </div>

                        {/* Description / Outcome */}
                        {item.notes && (
                          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Worklog Evidence Link */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                        {item.worklog_id || item.activity_id ? (
                          <button
                            onClick={() => {
                              const targetDate = item.date;
                              const actParam = item.activity_id ? `&activity_id=${item.activity_id}` : '';
                              navigate(`/manager/worklogs?mentor_id=${selectedMentorId}&date=${targetDate}${actParam}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 rounded-xl transition-all shadow-2xs group"
                          >
                            <span>Inspect Daily Worklog</span>
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              navigate(`/manager/worklogs?mentor_id=${selectedMentorId}&date=${item.date}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            <span>View Date Worklog</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {item.activity_task_name ? `Linked: ${item.activity_task_name}` : 'Logged activity'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT C: Skill Growth Timeline */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-6">
              <p className="text-xs text-slate-500">
                Progression of confidence ratings over time for each skill (e.g. 2.0 → 2.5 → 3.5 → 4.5 stars).
              </p>

              {skillsData.growth_timelines.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                  No growth timeline data available.
                </div>
              ) : (
                <div className="space-y-6">
                  {skillsData.growth_timelines.map((timeline) => (
                    <div
                      key={timeline.skill_name}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-extrabold text-slate-900">
                              {timeline.skill_name}
                            </h3>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                timeline.category_type === 'TECHNICAL'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {timeline.category_type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Initial: {timeline.initial_rating.toFixed(1)} ★ • Current:{' '}
                            <span className="font-bold text-slate-800">
                              {timeline.current_rating.toFixed(1)} ★
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 self-start sm:self-auto">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border ${
                              timeline.total_growth > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Total Growth: {timeline.total_growth > 0 ? `+${timeline.total_growth.toFixed(1)}` : '0.0'} ★
                          </span>
                        </div>
                      </div>

                      {/* Timeline points track */}
                      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200">
                        {timeline.history.map((pt, idx) => (
                          <div key={idx} className="relative group">
                            {/* Circle node on timeline */}
                            <div className="absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-sm text-slate-900">
                                    {pt.rating.toFixed(1)} ★
                                  </span>
                                  {pt.previous_rating !== null && (
                                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      +{pt.rating_change.toFixed(1)} ★
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-slate-400">
                                  {pt.formatted_date}
                                </span>
                              </div>

                              {pt.notes && (
                                <p className="text-xs text-slate-700 leading-relaxed">{pt.notes}</p>
                              )}

                              {/* Worklog Link Button */}
                              {pt.activity_id && (
                                <div className="pt-1">
                                  <button
                                    onClick={() => {
                                      navigate(
                                        `/manager/worklogs?mentor_id=${selectedMentorId}&date=${pt.date}&activity_id=${pt.activity_id}`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                                  >
                                    <span>View Supporting Daily Worklog Activity</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
