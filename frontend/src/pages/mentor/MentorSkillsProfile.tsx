import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BookOpen,
  Award,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import {
  MentorSkill,
  MentorSkillsProfileSummary,
  SkillCategoryType,
  SkillStatus
} from '../../types';
import { StarRating } from '../../components/StarRating';

export const MentorSkillsProfile: React.FC = () => {
  const [profile, setProfile] = useState<MentorSkillsProfileSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Predefined skills list
  const [predefinedSkills, setPredefinedSkills] = useState<{
    technical: string[];
    non_technical: string[];
  }>({ technical: [], non_technical: [] });

  // Add / Edit Modal or Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);

  // Form Fields
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [skillName, setSkillName] = useState<string>('');
  const [categoryType, setCategoryType] = useState<SkillCategoryType>('TECHNICAL');
  const [confidenceRating, setConfidenceRating] = useState<number>(3.0);
  const [status, setStatus] = useState<SkillStatus>('FAMILIAR');
  const [notes, setNotes] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Filter & Search inside profile view
  const [viewFilter, setViewFilter] = useState<'ALL' | 'TECHNICAL' | 'NON_TECHNICAL' | 'CURRENTLY_LEARNING'>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [expandedSkillHistory, setExpandedSkillHistory] = useState<Record<string, boolean>>({});

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getMySkills();
      setProfile(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load skills profile.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredefined = async () => {
    try {
      const data = await api.getPredefinedSkills();
      setPredefinedSkills(data);
    } catch {
      // fallback if error
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPredefined();
  }, []);

  // Filter predefined options for the dropdown
  const filteredPredefined = useMemo(() => {
    const list =
      categoryType === 'TECHNICAL'
        ? predefinedSkills.technical
        : predefinedSkills.non_technical;

    if (!searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase().trim();
    return list.filter((item) => item.toLowerCase().includes(q));
  }, [predefinedSkills, categoryType, searchQuery]);

  const existingSkillNames = useMemo(() => {
    if (!profile) return new Set<string>();
    return new Set(profile.skills.map((s) => s.skill_name.toLowerCase()));
  }, [profile]);

  const handleOpenAdd = (prefillName?: string) => {
    setEditingSkillId(null);
    setSkillName(prefillName || '');
    setSearchQuery(prefillName || '');
    setCategoryType('TECHNICAL');
    setConfidenceRating(3.0);
    setStatus('FAMILIAR');
    setNotes('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (skill: MentorSkill) => {
    setEditingSkillId(skill.id);
    setSkillName(skill.skill_name);
    setSearchQuery(skill.skill_name);
    setCategoryType(skill.category_type);
    setConfidenceRating(skill.confidence_rating);
    setStatus(skill.status);
    setNotes(skill.notes || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSkillId(null);
    setFormError('');
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = skillName.trim();
    if (!finalName) {
      setFormError('Please select or enter a skill name.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      if (editingSkillId) {
        // Update existing skill
        await api.updateMySkill(editingSkillId, {
          confidence_rating: confidenceRating,
          status,
          category_type: categoryType,
          notes: notes.trim() || undefined,
        });
        setSuccessMsg(`Skill "${finalName}" updated successfully.`);
      } else {
        // Check duplicate on client
        if (existingSkillNames.has(finalName.toLowerCase())) {
          setFormError(`Skill "${finalName}" is already in your profile.`);
          setFormSubmitting(false);
          return;
        }

        await api.addMySkill({
          skill_name: finalName,
          category_type: categoryType,
          confidence_rating: confidenceRating,
          status,
          notes: notes.trim() || undefined,
        });
        setSuccessMsg(`Skill "${finalName}" added to your profile!`);
      }

      handleCloseForm();
      await fetchProfile();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save skill.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skill: MentorSkill) => {
    if (
      !window.confirm(
        `Are you sure you want to remove "${skill.skill_name}" from your skills profile?`
      )
    ) {
      return;
    }

    try {
      await api.deleteMySkill(skill.id);
      setSuccessMsg(`Skill "${skill.skill_name}" removed.`);
      await fetchProfile();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete skill.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const toggleHistory = (skillId: string) => {
    setExpandedSkillHistory((prev) => ({
      ...prev,
      [skillId]: !prev[skillId],
    }));
  };

  // Filter skills for display
  const displayedSkills = useMemo(() => {
    if (!profile) return [];
    return profile.skills.filter((s) => {
      if (viewFilter === 'TECHNICAL' && s.category_type !== 'TECHNICAL') return false;
      if (viewFilter === 'NON_TECHNICAL' && s.category_type !== 'NON_TECHNICAL') return false;
      if (viewFilter === 'CURRENTLY_LEARNING' && s.status !== 'CURRENTLY_LEARNING') return false;

      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase().trim();
        const matchesName = s.skill_name.toLowerCase().includes(q);
        const matchesNotes = s.notes?.toLowerCase().includes(q) || false;
        return matchesName || matchesNotes;
      }
      return true;
    });
  }, [profile, viewFilter, filterSearch]);

  const getStatusBadge = (st: SkillStatus) => {
    switch (st) {
      case 'CURRENTLY_LEARNING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <BookOpen className="w-3 h-3 mr-1 text-blue-600" />
            Currently Learning
          </span>
        );
      case 'PROFICIENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Proficient
          </span>
        );
      case 'FAMILIAR':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
            Familiar
          </span>
        );
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading your skills profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-600/30 rounded-xl border border-indigo-500/30 text-indigo-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  My Skills & Growth Profile
                </h1>
                <p className="text-sm text-indigo-200/90 mt-0.5">
                  Track your technical & mentoring capabilities, record learning milestones, and self-assess confidence.
                </p>
              </div>
            </div>

            {/* Self-Assessed Confidence Disclaimer Note */}
            <div className="inline-flex items-center space-x-2 text-xs text-amber-200/90 bg-amber-950/40 border border-amber-800/50 px-3 py-1.5 rounded-lg mt-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Ratings are <strong>Self-Assessed Confidence (0.5 to 5.0 stars)</strong> to guide your personal upskilling and mentoring matching.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-lg shadow-emerald-900/30 transition-all border border-emerald-500/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </button>
          </div>
        </div>

        {/* Completion Prompt Notice if Profile is Empty */}
        {profile && !profile.is_profile_completed && (
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Welcome to NIAT! Please complete your Skills Profile
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Adding your core technical technologies (Python, JavaScript, React, SQL, etc.) and mentoring strengths helps managers match you with student cohorts and celebrate your learning milestones.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center space-x-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center space-x-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Key Metrics Summary Cards */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Total Skills</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900">{profile.total_skills}</span>
              <span className="text-xs text-slate-500">skills recorded</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-indigo-600 text-xs font-semibold uppercase tracking-wider">
              <span>Avg Confidence</span>
              <Award className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-indigo-900">
                {profile.average_confidence > 0 ? profile.average_confidence.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-slate-500">/ 5.0 stars</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-blue-600 text-xs font-semibold uppercase tracking-wider">
              <span>Currently Learning</span>
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-blue-900">{profile.currently_learning_count}</span>
              <span className="text-xs text-slate-500">active upskilling</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase tracking-wider">
              <span>Technical Skills</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-emerald-900">{profile.technical_skills_count}</span>
              <span className="text-xs text-slate-500">languages / tools</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-purple-600 text-xs font-semibold uppercase tracking-wider">
              <span>Non-Technical</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-purple-900">{profile.non_technical_skills_count}</span>
              <span className="text-xs text-slate-500">mentoring skills</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Skills ({profile?.skills.length || 0})
          </button>
          <button
            onClick={() => setViewFilter('TECHNICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewFilter === 'TECHNICAL'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Technical ({profile?.technical_skills_count || 0})
          </button>
          <button
            onClick={() => setViewFilter('NON_TECHNICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewFilter === 'NON_TECHNICAL'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            Non-Technical ({profile?.non_technical_skills_count || 0})
          </button>
          <button
            onClick={() => setViewFilter('CURRENTLY_LEARNING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewFilter === 'CURRENTLY_LEARNING'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Currently Learning ({profile?.currently_learning_count || 0})
          </button>
        </div>

        {/* Search filter input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search your skills or notes..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
          {filterSearch && (
            <button
              onClick={() => setFilterSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Skills Grid */}
      {displayedSkills.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">No skills found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filterSearch
                ? `No skills match "${filterSearch}". Try a different search keyword.`
                : 'You have not added any skills in this category yet. Click "Add Skill" above to get started!'}
            </p>
          </div>
          <button
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add First Skill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedSkills.map((skill) => {
            const isHistoryOpen = !!expandedSkillHistory[skill.id];
            return (
              <div
                key={skill.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  {/* Top: Name, Status & Category Pill */}
                  <div className="flex items-start justify-between gap-2">
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
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{skill.skill_name}</h3>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEdit(skill)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Skill Rating"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSkill(skill)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove Skill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>{getStatusBadge(skill.status)}</div>

                  {/* Star Rating Section */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                    <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Self-Assessed Confidence
                    </div>
                    <div className="flex items-center justify-between">
                      <StarRating
                        value={skill.confidence_rating}
                        size="md"
                        showLabel={true}
                        showSelfAssessedTag={false}
                      />
                    </div>
                  </div>

                  {/* Notes / Description */}
                  {skill.notes ? (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {skill.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No notes recorded.</p>
                  )}
                </div>

                {/* Footer: Last updated date & Growth Log toggle */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Updated: {skill.last_updated_formatted || 'Recently'}</span>
                  </div>

                  <button
                    onClick={() => toggleHistory(skill.id)}
                    className="inline-flex items-center space-x-1 font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Growth ({skill.growth_count})</span>
                    {isHistoryOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Collapsible History Section */}
                {isHistoryOpen && (
                  <div className="p-4 bg-slate-100/70 border-t border-slate-200 space-y-2 text-xs">
                    <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                      Confidence Growth History
                    </p>
                    {skill.growth_logs && skill.growth_logs.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {skill.growth_logs.map((log) => (
                          <div
                            key={log.id}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold text-slate-800">
                                {log.previous_rating !== null && log.previous_rating !== undefined
                                  ? `${log.previous_rating.toFixed(1)} ★ → ${log.new_rating.toFixed(1)} ★`
                                  : `${log.new_rating.toFixed(1)} ★ (Baseline)`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {log.formatted_date}
                              </span>
                            </div>
                            {log.notes && (
                              <p className="text-[11px] text-slate-600 leading-tight">
                                {log.notes}
                              </p>
                            )}
                            {log.activity_task_name && (
                              <div className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded inline-block">
                                Worklog: {log.activity_task_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic text-[11px]">No growth history logs.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add / Edit Skill Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600/30 rounded-lg text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingSkillId ? 'Update Skill & Confidence' : 'Add Skill to Profile'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Self-assessed confidence scale (0.5 to 5.0 stars)
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseForm}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSkill} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category Type Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryType('TECHNICAL')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                      categoryType === 'TECHNICAL'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Technical Skill
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryType('NON_TECHNICAL')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                      categoryType === 'NON_TECHNICAL'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Non-Technical / Mentoring
                  </button>
                </div>
              </div>

              {/* Skill Name with Searchable Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Skill Name <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Search or enter custom skill (e.g. Python, React)..."
                    value={skillName}
                    onChange={(e) => {
                      setSkillName(e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  {/* Predefined Suggestions Chips */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Popular {categoryType === 'TECHNICAL' ? 'technologies' : 'skills'}:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                      {filteredPredefined.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setSkillName(item);
                            setSearchQuery(item);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                            skillName.toLowerCase() === item.toLowerCase()
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence Rating Picker (0.5 to 5.0 in 0.5 increments) */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Self-Assessed Confidence
                  </label>
                  <span className="text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                    {confidenceRating.toFixed(1)} / 5.0 Stars
                  </span>
                </div>

                <div className="flex items-center justify-center py-2">
                  <StarRating
                    value={confidenceRating}
                    onChange={(val) => setConfidenceRating(val)}
                    interactive={true}
                    size="lg"
                    showLabel={false}
                  />
                </div>

                {/* Quick increment buttons for precision */}
                <div className="flex flex-wrap justify-center gap-1 pt-1">
                  {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConfidenceRating(val)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all ${
                        confidenceRating === val
                          ? 'bg-amber-600 text-white border-amber-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                      }`}
                    >
                      {val.toFixed(1)}★
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800 text-center italic">
                  Click left half of star for 0.5 increment, or pick a button above.
                </p>
              </div>

              {/* Status Picker (Currently Learning, Familiar, Proficient) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Learning Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('CURRENTLY_LEARNING')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                      status === 'CURRENTLY_LEARNING'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                    }`}
                  >
                    Currently Learning
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('FAMILIAR')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                      status === 'FAMILIAR'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-purple-50'
                    }`}
                  >
                    Familiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('PROFICIENT')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                      status === 'PROFICIENT'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                    }`}
                  >
                    Proficient
                  </button>
                </div>
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes or Milestones Achieved (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mastered async/await, built dashboard with Tailwind and React hooks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-all shadow-md shadow-emerald-900/20"
                >
                  {formSubmitting ? 'Saving...' : editingSkillId ? 'Update Skill' : 'Add to Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
