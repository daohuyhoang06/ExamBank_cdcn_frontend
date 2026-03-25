import { Navigate, createBrowserRouter } from "react-router-dom";
import LoginPage from "@/features/auth/pages/login-page";
import RegisterPage from "@/features/auth/pages/register-page";
import LandingPage from "@/features/landing/pages/landing-page";
import AdminShell from "@/features/admin/pages/admin-shell";
import AdminDashboardPage from "@/features/admin/pages/admin-dashboard-page";
import AdminUsersPage from "@/features/admin/pages/admin-users-page";
import AdminContentPage from "@/features/admin/pages/admin-content-page";
import AdminExamsPage from "@/features/admin/pages/admin-exams-page";
import AdminQuestionBankPage from "@/features/admin/pages/admin-question-bank-page";
import AdminFinancialPage from "@/features/admin/pages/admin-financial-page";
import AdminSystemPage from "@/features/admin/pages/admin-system-page";


export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/admin",
    element: <AdminShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <AdminDashboardPage />,
      },
      {
        path: "users",
        element: <AdminUsersPage />,
      },
      {
        path: "content",
        element: <AdminContentPage />,
      },
      {
        path: "exams",
        element: <AdminExamsPage />,
      },
      {
        path: "question-bank",
        element: <AdminQuestionBankPage />,
      },
      {
        path: "financial",
        element: <AdminFinancialPage />,
      },
      {
        path: "system",
        element: <AdminSystemPage />,
      },
    ],
  },
]);