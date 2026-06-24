import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import Login from './pages/Login';
import Profile from './pages/Profile';
import MaintainerDashboard from './pages/maintainer/Dashboard';
import UserManagement from './pages/maintainer/UserManagement';
import DepartmentManagement from './pages/maintainer/DepartmentManagement';
import CoordinatorDashboard from './pages/coordinator/Dashboard';
import BachelorProjects from './pages/coordinator/BachelorProjects';
import MasterThesis from './pages/coordinator/MasterThesis';
import Evaluations from './pages/coordinator/Evaluations';
import SupervisorList from './pages/coordinator/SupervisorList';
import SupervisorDashboard from './pages/supervisor/Dashboard';
import SupervisorBachelorProjects from './pages/supervisor/BachelorProjects';
import SupervisorMasterThesis from './pages/supervisor/MasterThesis';
import ProjectDetail from './pages/supervisor/ProjectDetail';
import StudentDashboard from './pages/student/Dashboard';
import StudentAssignment from './pages/student/Assignment';
import StudentMarksFeedback from './pages/student/MarksFeedback';
import StudentSubmissions from './pages/student/Submissions';
import StudentNotifications from './pages/student/Notifications';
import ExternalDashboard from './pages/external/Dashboard';
import ExternalEvaluationsList from './pages/external/EvaluationsList';
import ExternalEvaluationPage from './pages/external/EvaluationPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/maintainer/users" element={<PrivateRoute role="MAINTAINER"><UserManagement /></PrivateRoute>} />
          <Route path="/maintainer/departments" element={<PrivateRoute role="MAINTAINER"><DepartmentManagement /></PrivateRoute>} />
          <Route path="/maintainer/*" element={<PrivateRoute role="MAINTAINER"><MaintainerDashboard /></PrivateRoute>} />
          <Route path="/coordinator/bachelor" element={<PrivateRoute role="COORDINATOR"><BachelorProjects /></PrivateRoute>} />
          <Route path="/coordinator/master" element={<PrivateRoute role="COORDINATOR"><MasterThesis /></PrivateRoute>} />
          <Route path="/coordinator/evaluations" element={<PrivateRoute role="COORDINATOR"><Evaluations /></PrivateRoute>} />
          <Route path="/coordinator/supervisors" element={<PrivateRoute role="COORDINATOR"><SupervisorList /></PrivateRoute>} />
          <Route path="/coordinator/project/:type/:id" element={<PrivateRoute role="COORDINATOR"><ProjectDetail /></PrivateRoute>} />
          <Route path="/coordinator/*" element={<PrivateRoute role="COORDINATOR"><CoordinatorDashboard /></PrivateRoute>} />
          <Route path="/supervisor/bachelor" element={<PrivateRoute role="SUPERVISOR"><SupervisorBachelorProjects /></PrivateRoute>} />
          <Route path="/supervisor/master" element={<PrivateRoute role="SUPERVISOR"><SupervisorMasterThesis /></PrivateRoute>} />
          <Route path="/supervisor/project/:type/:id" element={<PrivateRoute role="SUPERVISOR"><ProjectDetail /></PrivateRoute>} />
          <Route path="/supervisor/*" element={<PrivateRoute role="SUPERVISOR"><SupervisorDashboard /></PrivateRoute>} />
          <Route path="/student/assignment" element={<PrivateRoute role="STUDENT"><StudentAssignment /></PrivateRoute>} />
          <Route path="/student/marks" element={<PrivateRoute role="STUDENT"><StudentMarksFeedback /></PrivateRoute>} />
          <Route path="/student/feedback" element={<PrivateRoute role="STUDENT"><StudentMarksFeedback /></PrivateRoute>} />
          <Route path="/student/submissions" element={<PrivateRoute role="STUDENT"><StudentSubmissions /></PrivateRoute>} />
          <Route path="/student/notifications" element={<PrivateRoute role="STUDENT"><StudentNotifications /></PrivateRoute>} />
          <Route path="/student/*" element={<PrivateRoute role="STUDENT"><StudentDashboard /></PrivateRoute>} />
          <Route path="/external/groups" element={<PrivateRoute role="EXTERNAL_EXAMINER"><ExternalEvaluationsList /></PrivateRoute>} />
          <Route path="/external/theses" element={<PrivateRoute role="EXTERNAL_EXAMINER"><ExternalEvaluationsList /></PrivateRoute>} />
          <Route path="/external/evaluations" element={<PrivateRoute role="EXTERNAL_EXAMINER"><ExternalEvaluationsList /></PrivateRoute>} />
          <Route path="/external/evaluate/:type/:id" element={<PrivateRoute role="EXTERNAL_EXAMINER"><ExternalEvaluationPage /></PrivateRoute>} />
          <Route path="/external/*" element={<PrivateRoute role="EXTERNAL_EXAMINER"><ExternalDashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/" element={<Login />} />
        </Routes>
      </ToastProvider>
    </Router>
  );
}

export default App;
