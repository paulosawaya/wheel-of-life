// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import AssessmentPage from './pages/AssessmentPage';
import ResultsPage from './pages/ResultsPage';
import ActionPlanPage from './pages/ActionPlanPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#4ECDC4',
                  },
                },
                error: {
                  style: {
                    background: '#e74c3c',
                  },
                },
              }}
            />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<HomePage />} />
              <Route 
                path="/assessment/:id" 
                element={
                  <ProtectedRoute>
                    <AssessmentPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/results/:id" 
                element={
                  <ProtectedRoute>
                    <ResultsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/action-plan/:id" 
                element={
                  <ProtectedRoute>
                    <ActionPlanPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;