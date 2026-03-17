import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "@/pages/login-page";
import { ExamsPage } from "@/pages/exams-page";
import { ProfilePage } from "@/pages/profile-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ExamsPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/exams",
    element: <ExamsPage />,
  },
  {
    path: "/profile",
    element: <ProfilePage />,
  },
]);