import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/Login';
import {ProjectPage} from './pages/ProjectPage';
import './index.css';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/projects/demo" replace />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/projects/demo" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
