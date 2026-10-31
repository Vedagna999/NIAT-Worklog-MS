export type UserRole = 'MENTOR' | 'MANAGER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type ActivityGroup = 'LEARNING' | 'MENTORING' | 'INVIGILATION' | 'ADMINISTRATIVE';
export type WorklogStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface UserBrief {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  manager_id?: string | null;
  status: UserStatus;
}

export interface UserDetail extends UserBrief {
  manager?: UserBrief | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  activity_group: ActivityGroup;
  qualifies_for_six_hours: boolean;
}

export interface TaskTemplate {
  name: string;
  description: string;
  outcome: string;
}

export interface Activity {
  id: string;
  worklog_id: string;
  mentor_id: string;
  category_id: string;
  category?: Category;
  task_name: string;
  task_description?: string;
  outcome?: string;
  priority: TaskPriority;
  status: TaskStatus;
  planned_minutes?: number;
  start_time: string;
  end_time: string;
  actual_minutes: number;
  remarks?: string;
  dependencies?: string;
  deviations?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Feedback {
  id: string;
  worklog_id: string;
  manager_id: string;
  manager?: UserBrief;
  remarks: string;
  created_at: string;
}

export interface KpiSummary {
  total_minutes: number;
  total_formatted: string;
  completed_count: number;
  in_progress_count: number;
  blocked_count: number;
  learning_minutes: number;
  learning_formatted: string;
  is_target_achieved: boolean;
  qualifying_minutes: number;
}

export interface DailyWorklog {
  id: string;
  mentor_id: string;
  mentor?: UserBrief;
  work_date: string;
  status: WorklogStatus;
  total_actual_minutes: number;
  is_target_achieved: boolean;
  submission_time?: string | null;
  activities: Activity[];
  feedbacks: Feedback[];
  kpi_summary?: KpiSummary;
  date_strip?: DatePillSummary[];
}

export interface DatePillSummary {
  work_date: string;
  status?: WorklogStatus | null;
  total_minutes: number;
  is_target_achieved: boolean;
  activity_count: number;
  learning_minutes: number;
  is_missing?: boolean;
  is_not_available?: boolean;
}

export interface MissingWorklogItem {
  work_date: string;
  formatted_date: string;
  day_name: string;
  days_ago: number;
}

export interface MonthlyCalendarDay {
  work_date: string;
  day_number: number;
  is_current_month: boolean;
  is_today: boolean;
  is_future: boolean;
  is_weekend: boolean;
  status?: WorklogStatus | null;
  total_minutes: number;
  total_formatted: string;
  is_target_achieved: boolean;
  is_missing: boolean;
  is_not_available?: boolean;
  activity_count: number;
}

export interface MentorRosterItem {
  id: string;
  full_name: string;
  email: string;
  status: UserStatus;
  today_status?: WorklogStatus | null;
  today_minutes: number;
  today_target_achieved: boolean;
}

export interface ManagerDashboardView {
  selected_mentor: UserBrief;
  selected_date: string;
  worklog?: DailyWorklog | null;
  kpi: KpiSummary;
  date_strip: DatePillSummary[];
}

export interface MentorReportItem {
  mentor_id: string;
  name: string;
  email: string;
  days_logged: number;
  target_achieved_days: number;
  total_minutes: number;
  total_hours: string;
  learning_minutes: number;
  learning_hours: string;
  mentoring_minutes: number;
  mentoring_hours: string;
  invigilation_minutes: number;
  invigilation_hours: string;
  admin_minutes: number;
  admin_hours: string;
  completed_tasks: number;
  in_progress_tasks: number;
}

export interface ReportSummary {
  range_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_mentors: number;
  mentors_summary: MentorReportItem[];
}

export interface TopicLearningItem {
  topic: string;
  total_minutes: number;
  total_hours: string;
  activity_count: number;
  most_recent_date: string;
  recorded_outcomes: string[];
}

export interface PracticalOutcomeItem {
  outcome: string;
  task_name: string;
  work_date: string;
  minutes: number;
  minutes_formatted: string;
}

export interface WeeklyLearningTrendItem {
  week_label: string;
  start_date: string;
  end_date: string;
  learning_minutes: number;
  learning_hours: string;
  topics: string[];
}

export interface CategoryTimeDistributionItem {
  category_id: string;
  category_name: string;
  activity_group: string;
  total_minutes: number;
  total_hours: string;
  percentage: number;
}

export interface WorklogExceptionItem {
  work_date: string;
  formatted_date: string;
  day_name: string;
  exception_type: 'MISSING' | 'SUB_TARGET';
  total_minutes: number;
  total_hours: string;
  activity_count: number;
}

export interface LearningOverviewSummary {
  total_learning_minutes: number;
  total_learning_hours: string;
  distinct_topics_count: number;
  learning_activities_count: number;
  practical_outcomes_count: number;
}

export interface MentorPerformanceOverview {
  mentor_id: string;
  mentor_name: string;
  mentor_email: string;
  period: string;
  start_date: string;
  end_date: string;
  
  total_actual_minutes: number;
  total_actual_hours: string;
  learning_minutes: number;
  learning_hours: string;
  mentoring_minutes: number;
  mentoring_hours: string;
  invigilation_minutes: number;
  invigilation_hours: string;
  admin_minutes: number;
  admin_hours: string;
  
  qualifying_working_days: number;
  days_with_worklog: number;
  days_meeting_target: number;
  days_below_target: number;
  missing_worklog_days: number;
  worklog_completion_rate: number;
  
  learning_summary: LearningOverviewSummary;
  topics_learned: TopicLearningItem[];
  practical_outcomes: PracticalOutcomeItem[];
  weekly_learning_trend: WeeklyLearningTrendItem[];
  category_distribution: CategoryTimeDistributionItem[];
  exceptions: WorklogExceptionItem[];
}

export type EvidenceType = 'all' | 'LEARNING' | 'PRACTICE' | 'TEACHING_EXPERIENCE' | 'RELATED';

export interface SkillFinderActivityItem {
  id: string;
  worklog_id: string;
  work_date: string;
  formatted_date: string;
  task_name: string;
  task_description?: string;
  outcome?: string;
  remarks?: string;
  category_name: string;
  category_group: string;
  start_time: string;
  end_time: string;
  start_time_formatted: string;
  end_time_formatted: string;
  actual_minutes: number;
  duration_formatted: string;
  evidence_type: 'LEARNING' | 'PRACTICE' | 'TEACHING_EXPERIENCE' | 'RELATED';
  evidence_label: string;
  evidence_note: string;
  matched_term: string;
}

export interface SkillFinderMentorResult {
  mentor_id: string;
  mentor_name: string;
  mentor_email: string;
  manager_name?: string;
  total_matching_activities: number;
  total_relevant_minutes: number;
  total_relevant_hours: string;
  most_recent_activity_date?: string;
  most_recent_activity_formatted?: string;
  evidence_types_present: string[];
  activities: SkillFinderActivityItem[];
}

export interface SkillFinderSearchResponse {
  query: string;
  search_terms_used: string[];
  total_matching_mentors: number;
  total_matching_activities: number;
  total_recorded_minutes: number;
  total_recorded_hours: string;
  evidence_counts: Record<string, number>;
  mentors: SkillFinderMentorResult[];
}

// ============================================================================
// Mentor Skills & Growth Platform Types
// ============================================================================

export type SkillCategoryType = 'TECHNICAL' | 'NON_TECHNICAL';
export type SkillStatus = 'CURRENTLY_LEARNING' | 'FAMILIAR' | 'PROFICIENT';

export interface SkillGrowthLog {
  id: string;
  mentor_skill_id: string;
  skill_name?: string;
  mentor_id: string;
  worklog_id?: string;
  activity_id?: string;
  log_date: string;
  formatted_date?: string;
  previous_rating?: number;
  new_rating: number;
  status?: SkillStatus;
  notes?: string;
  activity_task_name?: string;
  activity_outcome?: string;
  created_at: string;
}

export interface MentorSkill {
  id: string;
  mentor_id: string;
  skill_name: string;
  category_type: SkillCategoryType;
  confidence_rating: number;
  status: SkillStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  last_updated_formatted?: string;
  growth_count: number;
  growth_logs: SkillGrowthLog[];
}

export interface MentorSkillsProfileSummary {
  mentor_id: string;
  mentor_name: string;
  mentor_email: string;
  is_profile_completed: boolean;
  total_skills: number;
  technical_skills_count: number;
  non_technical_skills_count: number;
  currently_learning_count: number;
  familiar_count: number;
  proficient_count: number;
  average_confidence: number;
  skills: MentorSkill[];
}

export interface SkillGrowthTimelinePoint {
  date: string;
  formatted_date: string;
  rating: number;
  previous_rating?: number;
  rating_change: number;
  notes?: string;
  activity_id?: string;
  worklog_id?: string;
}

export interface SkillGrowthTimeline {
  skill_name: string;
  category_type: SkillCategoryType;
  current_rating: number;
  initial_rating: number;
  total_growth: number;
  history: SkillGrowthTimelinePoint[];
}

export interface RecentlyUpskilledItem {
  id: string;
  skill_id: string;
  skill_name: string;
  category_type: SkillCategoryType;
  date: string;
  formatted_date: string;
  previous_rating?: number;
  current_rating: number;
  status?: SkillStatus;
  notes?: string;
  worklog_id?: string;
  activity_id?: string;
  activity_task_name?: string;
}

export interface ManagerMentorSkillsView {
  mentor_id: string;
  mentor_name: string;
  mentor_email: string;
  manager_name?: string;
  summary: MentorSkillsProfileSummary;
  skills: MentorSkill[];
  recently_upskilled: RecentlyUpskilledItem[];
  growth_timelines: SkillGrowthTimeline[];
}


