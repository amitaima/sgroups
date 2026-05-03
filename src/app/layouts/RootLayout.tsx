import { Outlet } from "react-router-dom";
import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import { Button } from "@components/ui/Button/Button";
import { useAuth } from "@app/providers/AuthProvider";
import "./RootLayout.scss";

export const RootLayout = () => {
  const { user, initializing, signOutUser } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <PageContainer>
          <div className="app-shell__header-inner">
            <div className="app-shell__brand">
              <span className="app-shell__brand-accent">SGroups</span>
            </div>
            <div className="app-shell__actions">
              <span className="app-shell__status">
                {initializing
                  ? "טוען..."
                  : user?.email || user?.displayName || "מחובר"}
              </span>
              <Button variant="secondary" onClick={signOutUser}>
                יציאה
              </Button>
            </div>
          </div>
        </PageContainer>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
};
