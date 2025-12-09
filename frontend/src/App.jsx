import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider.jsx";

import Layout from "./components/layout/Layout.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import Login from "./pages/Login";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard";
import SipsPage from "./pages/Sips.jsx";
import SipDetail from "./pages/SipDetail.jsx";
import GoalsPage from "./pages/GoalsPage.jsx";
import RecommendationsPage from "./pages/RecommendationsPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import NavHistoryPage from "./pages/NavHistoryPage.jsx";

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sips"
          element={
            <ProtectedRoute>
              <Layout>
                <SipsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sips/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <SipDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <Layout>
                <GoalsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recommendations"
          element={
            <ProtectedRoute>
              <Layout>
                <RecommendationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <NotificationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/funds/:scheme_code"
          element={
            <ProtectedRoute>
              <Layout>
                <NavHistoryPage />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
