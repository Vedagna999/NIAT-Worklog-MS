import {
  UserBrief,
  UserDetail,
  Category,
  DailyWorklog,
  Activity,
  Feedback,
  ManagerDashboardView,
  MentorRosterItem,
  ReportSummary,
  TaskTemplate,
  MissingWorklogItem,
  MonthlyCalendarDay,
  MentorPerformanceOverview,
  SkillFinderSearchResponse,
  SkillCategoryType,
  SkillStatus,
  MentorSkill,
  MentorSkillsProfileSummary,
  ManagerMentorSkillsView
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function getAuthToken(): string | null {
  return localStorage.getItem('niat_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token and redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('niat_token');
      localStorage.removeItem('niat_user');
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<{ access_token: string; token_type: string; user: UserBrief }> => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  getMe: async (): Promise<UserDetail> => {
    return request('/auth/me');
  },

  // Categories & Templates
  getCategories: async (): Promise<Category[]> => {
    return request('/categories');
  },
  getTaskTemplates: async (): Promise<Record<string, TaskTemplate[]>> => {
    return request('/categories/templates');
  },
  createCategory: async (data: { name: string; activity_group: string; qualifies_for_six_hours: boolean }): Promise<Category> => {
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Worklogs (Mentor)
  getDailyWorklog: async (dateStr?: string): Promise<DailyWorklog> => {
    const q = dateStr ? `?date=${dateStr}` : '';
    return request(`/worklogs/daily${q}`);
  },
  updateWorklogStatus: async (status: 'DRAFT' | 'SUBMITTED', dateStr?: string): Promise<DailyWorklog> => {
    const q = dateStr ? `?date=${dateStr}` : '';
    return request(`/worklogs/daily/status${q}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
  addActivity: async (data: any, dateStr?: string): Promise<Activity> => {
    const q = dateStr ? `?date=${dateStr}` : '';
    return request(`/worklogs/activities${q}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateActivity: async (activityId: string, data: any): Promise<Activity> => {
    return request(`/worklogs/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteActivity: async (activityId: string): Promise<{ message: string }> => {
    return request(`/worklogs/activities/${activityId}`, {
      method: 'DELETE',
    });
  },
  getMissingWorklogs: async (): Promise<MissingWorklogItem[]> => {
    return request('/worklogs/missing');
  },
  getMonthlyWorklogs: async (month?: string): Promise<MonthlyCalendarDay[]> => {
    const q = month ? `?month=${month}` : '';
    return request(`/worklogs/monthly${q}`);
  },
  getMyLearning: async (params?: {
    search?: string;
    date_range?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.date_range && params.date_range !== 'all') sp.append('date_range', params.date_range);
    if (params?.start_date) sp.append('start_date', params.start_date);
    if (params?.end_date) sp.append('end_date', params.end_date);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return request(`/worklogs/learning${q}`);
  },

  // Manager Portal
  getAssignedMentors: async (): Promise<MentorRosterItem[]> => {
    return request('/manager/mentors');
  },
  getTeamOverview: async (
    period: string = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<any> => {
    const params = new URLSearchParams();
    params.append('period', period);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/manager/team-overview?${params.toString()}`);
  },
  getMentorAnalytics: async (
    mentorId: string,
    period: string = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<MentorPerformanceOverview> => {
    const params = new URLSearchParams();
    params.append('mentor_id', mentorId);
    params.append('period', period);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/manager/analytics?${params.toString()}`);
  },
  getManagerDashboard: async (mentorId?: string, dateStr?: string): Promise<ManagerDashboardView> => {
    const params = new URLSearchParams();
    if (mentorId) params.append('mentor_id', mentorId);
    if (dateStr) params.append('date', dateStr);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request(`/manager/dashboard${q}`);
  },
  getManagerMonthlyCalendar: async (mentorId: string, month?: string): Promise<MonthlyCalendarDay[]> => {
    const params = new URLSearchParams();
    params.append('mentor_id', mentorId);
    if (month) params.append('month', month);
    return request(`/manager/monthly?${params.toString()}`);
  },
  leaveFeedback: async (
    worklogId?: string,
    remarks: string = '',
    mentorId?: string,
    workDate?: string
  ): Promise<Feedback> => {
    if (worklogId) {
      return request(`/manager/worklogs/${worklogId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ remarks }),
      });
    } else if (mentorId && workDate) {
      return request('/manager/feedback', {
        method: 'POST',
        body: JSON.stringify({
          mentor_id: mentorId,
          work_date: workDate,
          remarks,
        }),
      });
    }
    throw new Error('Either worklogId or mentorId and workDate must be provided.');
  },
  getReportsSummary: async (rangeType: 'weekly' | 'monthly'): Promise<ReportSummary> => {
    return request(`/manager/reports/summary?range_type=${rangeType}`);
  },
  searchMentorSkills: async (params: {
    q: string;
    evidence_type?: string;
    date_range?: string;
    start_date?: string;
    end_date?: string;
    mentor_id?: string;
  }): Promise<SkillFinderSearchResponse> => {
    const sp = new URLSearchParams();
    sp.append('q', params.q);
    if (params.evidence_type && params.evidence_type !== 'all') sp.append('evidence_type', params.evidence_type);
    if (params.date_range && params.date_range !== 'all') sp.append('date_range', params.date_range);
    if (params.start_date) sp.append('start_date', params.start_date);
    if (params.end_date) sp.append('end_date', params.end_date);
    if (params.mentor_id) sp.append('mentor_id', params.mentor_id);
    return request(`/manager/skill-finder?${sp.toString()}`);
  },

  // Mentor Skills & Growth Platform
  getPredefinedSkills: async (): Promise<{ technical: string[]; non_technical: string[] }> => {
    return request('/skills/predefined');
  },
  getMySkills: async (): Promise<MentorSkillsProfileSummary> => {
    return request('/skills/me');
  },
  addMySkill: async (data: {
    skill_name: string;
    category_type: SkillCategoryType;
    confidence_rating: number;
    status: SkillStatus;
    notes?: string;
  }): Promise<MentorSkill> => {
    return request('/skills/me', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateMySkill: async (
    skillId: string,
    data: {
      confidence_rating?: number;
      status?: SkillStatus;
      notes?: string;
      category_type?: SkillCategoryType;
    }
  ): Promise<MentorSkill> => {
    return request(`/skills/me/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteMySkill: async (skillId: string): Promise<{ message: string }> => {
    return request(`/skills/me/${skillId}`, {
      method: 'DELETE',
    });
  },
  upskillSkill: async (data: {
    skill_id?: string;
    skill_name?: string;
    category_type?: SkillCategoryType;
    confidence_rating: number;
    status?: SkillStatus;
    worklog_id?: string;
    activity_id?: string;
    log_date?: string;
    notes?: string;
  }): Promise<MentorSkill> => {
    return request('/skills/me/upskill', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getMentorSkillsForManager: async (mentorId: string): Promise<ManagerMentorSkillsView> => {
    return request(`/skills/manager/mentors/${mentorId}`);
  },

  // Admin
  getAllUsers: async (): Promise<UserDetail[]> => {
    return request('/admin/users');
  },
  getManagersList: async (): Promise<UserBrief[]> => {
    return request('/users/managers');
  },
  createUser: async (data: any): Promise<UserDetail> => {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateUser: async (userId: string, data: any): Promise<UserDetail> => {
    return request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  reopenWorklog: async (worklogId: string): Promise<{ message: string; status: string }> => {
    return request(`/admin/worklogs/${worklogId}/reopen`, {
      method: 'POST',
    });
  },
};
