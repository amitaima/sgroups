import { useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useAuth } from "@app/providers/AuthProvider";
import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import { DashboardHeader } from "@components/layout/DashboardHeader/DashboardHeader";
import { DashboardSidebar } from "@components/layout/DashboardSidebar/DashboardSidebar";
import { ProfileMenuButton } from "@components/ui/ProfileMenuButton";
import {
  Sparkles,
  LayoutGrid,
  CheckSquare2,
  Calendar,
  Settings,
} from "lucide-react";
import "./RootLayout.scss";

const createSidebarItems = () => [
  {
    id: "dashboard",
    label: "מסך ניהול",
    icon: <LayoutGrid size={20} strokeWidth={2} />,
  },
  {
    id: "tasks",
    label: "משימות",
    icon: <CheckSquare2 size={20} strokeWidth={2} />,
  },
  {
    id: "calendar",
    label: "יומן",
    icon: <Calendar size={20} strokeWidth={2} />,
  },
  {
    id: "settings",
    label: "הגדרות פרויקט",
    icon: <Settings size={20} strokeWidth={2} />,
  },
];

export const RootLayout = () => {
  const { user, signOutUser } = useAuth();
  const { projectId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isProjectView = Boolean(projectId);

  return (
    <div
      className={`app-shell${isProjectView ? " app-shell--project" : " app-shell--home"}`}
    >
      {isProjectView ? (
        <DashboardSidebar
          items={createSidebarItems()}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentProjectId={projectId}
        />
      ) : null}
      <div
        className={`app-shell__content ${!isProjectView ? "special-background" : ""}`}
      >
        {isProjectView ? (
          <DashboardHeader
            currentProjectId={projectId}
            userLabel={user?.displayName || user?.email || "מחובר"}
            userPhoto={user?.photoURL || undefined}
            onOpenMenu={() => setSidebarOpen(true)}
            onSignOut={signOutUser}
          />
        ) : (
          <header className="app-shell__homebar">
            <PageContainer>
              <div className="app-shell__homebar-panel">
                <div className="app-shell__homebar-brand">
                  <div className="app-shell__homebar-mark">
                    <Sparkles size={18} strokeWidth={2.25} />
                  </div>
                  <div className="app-shell__homebar-copy">
                    <strong>SGroups</strong>
                  </div>
                </div>

                <ProfileMenuButton
                  userLabel={user?.displayName || user?.email || "מחובר"}
                  userPhoto={user?.photoURL || undefined}
                  onSignOut={signOutUser}
                  className="app-shell__homebar-profile"
                />
              </div>
            </PageContainer>
          </header>
        )}
        <main
          className={`app-shell__main ${isProjectView ? "overflow-y-auto" : ""}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
