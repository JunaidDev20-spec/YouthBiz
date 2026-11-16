import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import { Layout } from "./components/Layout.tsx";
import { Spinner } from "./components/ui.tsx";
import Login from "./pages/Login.tsx";
import TeacherDashboard from "./pages/teacher/Dashboard.tsx";
import Cohorts from "./pages/teacher/Cohorts.tsx";
import CohortDetail from "./pages/teacher/CohortDetail.tsx";
import Approvals from "./pages/teacher/Approvals.tsx";
import TeacherBusinessDetail from "./pages/teacher/BusinessDetail.tsx";
import StudentDashboard from "./pages/student/Dashboard.tsx";
import RegisterBusiness from "./pages/student/RegisterBusiness.tsx";
import Products from "./pages/student/Products.tsx";
import RecordSale from "./pages/student/RecordSale.tsx";
import RecordExpense from "./pages/student/RecordExpense.tsx";
import Financials from "./pages/student/Financials.tsx";
import Transactions from "./pages/student/Transactions.tsx";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "TEACHER" ? "/teacher" : "/student"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/cohorts" element={<Cohorts />} />
            <Route path="/teacher/cohorts/:id" element={<CohortDetail />} />
            <Route path="/teacher/approvals" element={<Approvals />} />
            <Route path="/teacher/businesses/:id" element={<TeacherBusinessDetail />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/register-business" element={<RegisterBusiness />} />
            <Route path="/student/products" element={<Products />} />
            <Route path="/student/sale" element={<RecordSale />} />
            <Route path="/student/expense" element={<RecordExpense />} />
            <Route path="/student/financials" element={<Financials />} />
            <Route path="/student/transactions" element={<Transactions />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
