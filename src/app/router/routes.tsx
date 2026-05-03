import type { RouteObject } from "react-router-dom";
import { AuthLayout } from "@app/layouts/AuthLayout";
import { RootLayout } from "@app/layouts/RootLayout";
import { ProtectedRoute } from "@app/router/ProtectedRoute";
import { DashboardPage } from "@pages/DashboardPage/DashboardPage";
import { LoginPage } from "@pages/LoginPage/LoginPage";

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
];
