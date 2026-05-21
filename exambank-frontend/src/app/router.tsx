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
import OnlineExamPage from "@/features/user/pages/OnlineExamPage";
import OnlineExamIntroPage from "@/features/user/pages/OnlineExamIntroPage";
import { StudentLayout } from "@/layouts/student/StudentLayout";
import ExamBankPage from "@/features/user/pages/ExamBankPage";
import SubmitExamPage from "@/features/user/pages/submit-exam/SubmitExamPage";
import Mysubmit from "@/features/user/pages/submit-exam/Mysubmit";
import Examreview from "@/features/user/pages/makeexam/page/Examreview";
import Comment from "@/features/user/pages/Comment";
import Exampage from "@/features/user/pages/makeexam/page/Exampage";
import AdminProfileDetailPage from "@/features/system/pages/admin-profile-detail-page";
import UserProfileSettingsPage from "@/features/user/pages/UserProfileSettingsPage";
import PremiumExamImportPage from "@/features/user/pages/PremiumExamImportPage";
import PremiumCompetitionsPage from "@/features/user/pages/PremiumCompetitionsPage";
import PrivateCompetitionJoinPage from "@/features/user/pages/PrivateCompetitionJoinPage";
import PremiumUpgradePage from "@/features/user/pages/PremiumUpgradePage";
import ModeratorShell from "@/features/moderator/pages/moderator-shell";
import ModeratorQueuePage from "@/features/moderator/pages/moderator-queue-page";
import ModeratorGradingPage from "@/features/moderator/pages/moderator-grading-page";
import ModeratorComposerPage from "@/features/moderator/pages/moderator-composer-page";
import ModeratorComposerFormPage from "@/features/moderator/pages/moderator-composer-form-page";
import ModeratorEditorialPage from "@/features/moderator/pages/moderator-editorial-page";
import ModeratorSubmitReviewPage from "@/features/moderator/pages/moderator-submit-review-page";
import ModeratorExamSessionManagementPage from "@/features/moderator/pages/moderator-exam-session-management-page";



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
    path: "/profile",
    element: <Navigate to="/user/profile" replace />,
  },
  {
    path: "/admin",
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "profile", element: <AdminProfileDetailPage /> },
      { path: "dashboard", element: <AdminDashboardPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "content", element: <AdminContentPage /> },
      { path: "exams", element: <AdminExamsPage /> },
      { path: "question-bank", element: <AdminQuestionBankPage /> },
      { path: "financial", element: <AdminFinancialPage /> },
      { path: "system", element: <AdminSystemPage /> },
      { path: "profile", element: <AdminProfileDetailPage /> },
    ],
  },
  {
    path: "/moderator",
    element: <ModeratorShell />,
    children: [
      { index: true, element: <Navigate to="/moderator/queue" replace /> },
      { path: "profile", element: <AdminProfileDetailPage /> },
      { path: "queue", element: <ModeratorQueuePage /> },
      { path: "grading", element: <ModeratorGradingPage /> },
      { path: "composer", element: <ModeratorComposerPage /> },
      { path: "composer/form", element: <ModeratorComposerFormPage /> },
      { path: "editorial", element: <ModeratorEditorialPage /> },
      { path: "submit-review", element: <ModeratorSubmitReviewPage /> },
      { path: "exam-sessions", element: <ModeratorExamSessionManagementPage /> },
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
      path: "exam/:examId",
      element: <Exampage />,
    },
    {
      path: "exam/:examId/overview",
      element: <OnlineExamIntroPage />,
    },
      {
        path: "comment", // URL: /user/comment
        element: <Comment />,
      },
      {
        path: "comment/:documentId", // URL: /user/comment/:documentId
        element: <Comment />,
      },
      {
        path: "profile",
        element: <UserProfileSettingsPage />,
      },
      {
        path: "online-exam",
        element: <OnlineExamPage />,
      },
      {
        path: "private-competition",
        element: <PrivateCompetitionJoinPage />,
      },
      {
        path: "premium/upgrade",
        element: <PremiumUpgradePage />,
      },
      {
        path: "premium/import",
        element: <PremiumExamImportPage />,
      },
      {
        path: "premium/competitions",
        element: <PremiumCompetitionsPage />,
      },
    ],
  },
]);
