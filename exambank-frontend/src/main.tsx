import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { ToastProvider } from "@/components/ui/Toast/toast-system";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./index.css";
import "./styles/theme.css";

console.log('Main.tsx rendering');

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>,
);