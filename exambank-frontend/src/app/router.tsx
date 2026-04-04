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
import UserHomePage from "@/features/user/pages/UserHomePage";
import { StudentLayout } from "@/layouts/student/StudentLayout";
import ExamBankPage from "@/features/user/pages/ExamBankPage";
import SubmitExamPage from "@/features/user/pages/submit-exam/SubmitExamPage";
import Mysubmit from "@/features/user/pages/submit-exam/Mysubmit";
import Examreview from "@/features/user/pages/makeexam/Examreview";

// Import trang Comment bạn vừa tạo
import Comment from "@/features/user/pages/Comment"; 

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
  
  // --- NHÓM ROUTES CHO ADMIN ---
  {
    path: "/admin",
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <AdminDashboardPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "content", element: <AdminContentPage /> },
      { path: "exams", element: <AdminExamsPage /> },
      { path: "question-bank", element: <AdminQuestionBankPage /> },
      { path: "financial", element: <AdminFinancialPage /> },
      { path: "system", element: <AdminSystemPage /> },
    ],
  },

  // --- NHÓM ROUTES CHO STUDENT (USER) ---
  {
    path: "/user",
    element: <StudentLayout />,
    children: [
      {
        index: true, // URL: /user
        element: <UserHomePage />,
      },
      {
        path: "exambank", // URL gốc: /user/exambank
        children: [
          { index: true, element: <ExamBankPage /> },
          { path: "submit", element: <SubmitExamPage /> },
          { path: "mysubmit", element: <Mysubmit /> },
          { path: "examreview", element: <Examreview /> },
        ],
      },
      {
        path: "comment", // URL: /user/comment
        element: <Comment />,
      },
    ],
  },
]);