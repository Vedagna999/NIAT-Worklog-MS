import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';

// Mentor Pages
import { MentorDashboard } from './pages/mentor/MentorDashboard';
import { MentorDailyWorklog } from './pages/mentor/MentorDailyWorklog';
import { MentorHistory } from './pages/mentor/MentorHistory';
import { MentorLearning } from './pages/mentor/MentorLearning';
import { MentorSkillsProfile } from './pages/mentor/MentorSkillsProfile';

// Manager Pages
import { ManagerTeamOverview } from './pages/manager/ManagerTeamOverview';
import { ManagerMentorInsights } from './pages/manager/ManagerMentorInsights';
import { ManagerWorklogHistory } from './pages/manager/ManagerWorklogHistory';
import { ManagerMentorSkills } from './pages/manager/ManagerMentorSkills';
import { MentorSkillFinder } from './pages/MentorSkillFinder';
import { Reports } from './pages/Reports';

// Admin Page
import { AdminPanel } from './pages/AdminPanel';

const RoleBasedHome: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'MENTOR') return <Navigate to="/worklog" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
  return <Navigate to="/admin" replace />;
};

const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Main Multi-Page App Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<RoleBasedHome />} />

        {/* ======================================================== */}
        {/* MENTOR MULTI-PAGE ROUTES                                 */}
        {/* ======================================================== */}
        <Route
          path="/worklog"
          element={
            <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
              <MentorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
              <MentorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/daily"
          element={
            <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
              <MentorDailyWorklog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/history"
          element={
            <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
              <MentorHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/learning"
          element={
            <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
              <MentorLearning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/skills"
          element={
            <ProtectedRoute allowedRoles={['MENTOR', 'ADMIN']}>
              <MentorSkillsProfile />
            </ProtectedRoute>
          }
        />

        {/* ======================================================== */}
        {/* MANAGER MULTI-PAGE ROUTES                                */}
        {/* ======================================================== */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerTeamOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/overview"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerTeamOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/insights"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerMentorInsights />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/worklogs"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerWorklogHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/skill-finder"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <MentorSkillFinder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/skills"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerMentorSkills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* ======================================================== */}
        {/* ADMIN ROUTES                                             */}
        {/* ======================================================== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
