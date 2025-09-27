import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/Login';
import { ProjectPage } from './pages/ProjectPage';
import ProjectsRedirect from './pages/ProjectsRedirect';
import './index.css';

export function LegacyReceptionRedirect() {
  return <Navigate to="../procesos/reception" replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ProjectsRedirect />} />
          <Route path="/projects" element={<ProjectsRedirect />} />
          <Route path="/projects/:id/reception" element={<LegacyReceptionRedirect />} />
          <Route path="/projects/:id/*" element={<ProjectPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

const container = typeof document !== 'undefined' ? document.getElementById('root') : null;

if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <AppRouter />
    </React.StrictMode>
  );
}
