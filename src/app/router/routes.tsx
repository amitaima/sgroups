import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AuthLayout } from "@app/layouts/AuthLayout";
import { RootLayout } from "@app/layouts/RootLayout";
import { ProtectedRoute } from "@app/router/ProtectedRoute";
import { DashboardPage } from "@pages/DashboardPage/DashboardPage";
import { JoinProjectPage } from "@pages/JoinProjectPage/JoinProjectPage";
import { TasksPage } from "@pages/TasksPage/TasksPage";
import { CalendarPage } from "@pages/CalendarPage/CalendarPage";
import { SettingsPage } from "@pages/SettingsPage/SettingsPage";
import { UserSettingsPage } from "@pages/UserSettingsPage";
import { LoginPage } from "@pages/LoginPage/LoginPage";
import { ProjectsHomePage } from "@pages/ProjectsHomePage/ProjectsHomePage";

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
    path: "/join/:projectId",
    element: <JoinProjectPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/settings",
        element: <UserSettingsPage />,
      },
      {
        path: "/",
        element: <Navigate to="/projects" replace />,
      },
      {
        path: "/projects",
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <ProjectsHomePage />,
          },
          {
            path: ":projectId",
            children: [
              {
                index: true,
                element: <DashboardPage />,
              },
              {
                path: "dashboard",
                element: <DashboardPage />,
              },
              {
                path: "tasks",
                element: <TasksPage />,
              },
              {
                path: "calendar",
                element: <CalendarPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
];
