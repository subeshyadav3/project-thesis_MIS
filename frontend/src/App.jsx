import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import PrivateRoute from './components/PrivateRoute';
import DegreeGuard from './components/DegreeGuard';
import AppLayout from './components/AppLayout';
import './App.css';

const routeFallback = (
  <div
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', color: 'var(--color-on-surface-variant)',
      fontFamily: 'var(--font-body)', fontSize: 14, gap: 10,
    }}
  >
    <span
      style={{
        width: 18, height: 18, borderRadius: '50%', display: 'inline-block',
        border: '2px solid var(--color-outline)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 0.9s linear infinite',
      }}
    />
    Loading…
  </div>
);

// Route-level code splitting: each page loads only when its route is visited.
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const MaintainerDashboard = lazy(() => import('./pages/maintainer/Dashboard'));
const UserManagement = lazy(() => import('./pages/maintainer/UserManagement'));
const DepartmentManagement = lazy(() => import('./pages/maintainer/DepartmentManagement'));
const FileAudit = lazy(() => import('./pages/maintainer/FileAudit'));
const CoordinatorDashboard = lazy(() => import('./pages/coordinator/Dashboard'));
const BachelorProjects = lazy(() => import('./pages/coordinator/BachelorProjects'));
const MasterThesis = lazy(() => import('./pages/coordinator/MasterThesis'));
const Evaluations = lazy(() => import('./pages/coordinator/Evaluations'));
const SupervisorList = lazy(() => import('./pages/coordinator/SupervisorList'));
const ExaminerList = lazy(() => import('./pages/coordinator/ExaminerList'));
const AuditLog = lazy(() => import('./pages/coordinator/AuditLog'));
const CoordinatorAnnouncements = lazy(() => import('./pages/coordinator/Announcements'));
const SupervisorAssignments = lazy(() => import('./pages/coordinator/SupervisorAssignments'));
const SupervisorDashboard = lazy(() => import('./pages/supervisor/Dashboard'));
const SupervisorBachelorProjects = lazy(() => import('./pages/supervisor/BachelorProjects'));
const SupervisorMasterThesis = lazy(() => import('./pages/supervisor/MasterThesis'));
const ProjectDetail = lazy(() => import('./pages/supervisor/ProjectDetail'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentProjects = lazy(() => import('./pages/student/Projects'));
const StudentTheses = lazy(() => import('./pages/student/Theses'));
const StudentGroups = lazy(() => import('./pages/student/Groups'));
const StudentProjectDetail = lazy(() => import('./pages/student/Assignment'));
const StudentSubmissions = lazy(() => import('./pages/student/Submissions'));
const StudentForms = lazy(() => import('./pages/student/Forms'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications'));
const ExternalDashboard = lazy(() => import('./pages/external/Dashboard'));
const ExternalEvaluationsList = lazy(() => import('./pages/external/EvaluationsList'));
const ExternalEvaluationPage = lazy(() => import('./pages/external/EvaluationPage'));
const NotFound = lazy(() => import('./pages/NotFound'));


function App() {
  return (
    <Router>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Suspense fallback={routeFallback}><Login /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={routeFallback}><ResetPassword /></Suspense>} />
          <Route path="/" element={<Suspense fallback={routeFallback}><Login /></Suspense>} />
          <Route path="*" element={<Suspense fallback={routeFallback}><NotFound /></Suspense>} />

          <Route element={<AppLayout />}>
            <Route path="/maintainer/users" element={<PrivateRoute role="MAINTAINER"><UserManagement /></PrivateRoute>} />
            <Route path="/maintainer/departments" element={<PrivateRoute role="MAINTAINER"><DepartmentManagement /></PrivateRoute>} />
            <Route path="/maintainer/audit-log" element={<PrivateRoute role="MAINTAINER"><AuditLog /></PrivateRoute>} />
            <Route path="/maintainer/files-audit" element={<PrivateRoute role="MAINTAINER"><FileAudit /></PrivateRoute>} />
            <Route path="/maintainer/*" element={<PrivateRoute role="MAINTAINER"><MaintainerDashboard /></PrivateRoute>} />
            <Route path="/coordinator/bachelor" element={<PrivateRoute role="COORDINATOR"><DegreeGuard requiredDegreeType="BACHELOR"><BachelorProjects /></DegreeGuard></PrivateRoute>} />
            <Route path="/coordinator/master" element={<PrivateRoute role="COORDINATOR"><DegreeGuard requiredDegreeType="MASTER"><MasterThesis /></DegreeGuard></PrivateRoute>} />
            <Route path="/coordinator/evaluations" element={<PrivateRoute role="COORDINATOR"><Evaluations /></PrivateRoute>} />
            <Route path="/coordinator/supervisors" element={<PrivateRoute role="COORDINATOR"><SupervisorList /></PrivateRoute>} />
            <Route path="/coordinator/examiners" element={<PrivateRoute role="COORDINATOR"><ExaminerList /></PrivateRoute>} />
            <Route path="/coordinator/project/:type/:id" element={<PrivateRoute role="COORDINATOR"><ProjectDetail /></PrivateRoute>} />
            <Route path="/coordinator/audit-log" element={<PrivateRoute role="COORDINATOR"><AuditLog /></PrivateRoute>} />
            <Route path="/coordinator/announcements" element={<PrivateRoute role="COORDINATOR"><CoordinatorAnnouncements /></PrivateRoute>} />
            <Route path="/coordinator/users" element={<PrivateRoute role="COORDINATOR"><UserManagement /></PrivateRoute>} />
            <Route path="/coordinator/notifications" element={<PrivateRoute role="COORDINATOR"><StudentNotifications /></PrivateRoute>} />
            <Route path="/coordinator/*" element={<PrivateRoute role="COORDINATOR"><CoordinatorDashboard /></PrivateRoute>} />
            <Route path="/supervisor/bachelor" element={<PrivateRoute role={['SUPERVISOR', 'COORDINATOR']}><SupervisorBachelorProjects /></PrivateRoute>} />
            <Route path="/supervisor/master" element={<PrivateRoute role={['SUPERVISOR', 'COORDINATOR']}><SupervisorMasterThesis /></PrivateRoute>} />
            <Route path="/supervisor/project/:type/:id" element={<PrivateRoute role={['SUPERVISOR', 'COORDINATOR']}><ProjectDetail /></PrivateRoute>} />
            <Route path="/supervisor/notifications" element={<PrivateRoute role={['SUPERVISOR', 'COORDINATOR']}><StudentNotifications /></PrivateRoute>} />
            <Route path="/supervisor/*" element={<PrivateRoute role={['SUPERVISOR', 'COORDINATOR']}><SupervisorDashboard /></PrivateRoute>} />
            <Route path="/student/projects" element={<PrivateRoute role="STUDENT"><StudentProjects /></PrivateRoute>} />
            <Route path="/student/theses" element={<PrivateRoute role="STUDENT"><StudentTheses /></PrivateRoute>} />
            <Route path="/student/groups" element={<PrivateRoute role="STUDENT"><StudentGroups /></PrivateRoute>} />
            <Route path="/student/:type/:id" element={<PrivateRoute role="STUDENT"><StudentProjectDetail /></PrivateRoute>} />
            <Route path="/student/submissions" element={<PrivateRoute role="STUDENT"><StudentSubmissions /></PrivateRoute>} />
            <Route path="/student/forms" element={<PrivateRoute role="STUDENT"><StudentForms /></PrivateRoute>} />
            <Route path="/student/notifications" element={<PrivateRoute role="STUDENT"><StudentNotifications /></PrivateRoute>} />
            <Route path="/student/*" element={<PrivateRoute role="STUDENT"><StudentDashboard /></PrivateRoute>} />
            <Route path="/external/groups" element={<PrivateRoute role={['EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR']}><ExternalEvaluationsList /></PrivateRoute>} />
            <Route path="/external/theses" element={<PrivateRoute role={['EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR']}><ExternalEvaluationsList /></PrivateRoute>} />
            <Route path="/external/evaluations" element={<PrivateRoute role={['EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR']}><ExternalEvaluationsList /></PrivateRoute>} />
            <Route path="/external/evaluate/:type/:id" element={<PrivateRoute role={['EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR']}><ExternalEvaluationPage /></PrivateRoute>} />
            <Route path="/external/notifications" element={<PrivateRoute role={['EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR']}><StudentNotifications /></PrivateRoute>} />
            <Route path="/external/*" element={<PrivateRoute role={['EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR']}><ExternalDashboard /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          </Route>
        </Routes>
      </ToastProvider>
    </Router>
  );
}

export default App;
