// src/App.tsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import AdminDashboard from './components/AdminDashboard';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute'; // <-- Import ProtectedRoute
import { Container } from '@mui/material';

function App() {
  return (
    <Container>
      <Routes>
      {/* Publicly accessible login page */}
       {/* Public Routes */}
      <Route path="/" element={<FileUpload />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<AdminDashboard />} />
      </Route>
            </Routes>
    </Container>
  );
}

export default App;