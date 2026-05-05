import { Navigate, useParams } from "react-router-dom";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import "./SettingsPage.scss";

export const SettingsPage = () => {
  const { projectId } = useParams();
  const { project, loading, error } = useWorkspaceProject(projectId);

  if (loading) {
    return (
      <PageSection className="settings-page">Loading workspace...</PageSection>
    );
  }

  if (error) {
    return <PageSection className="settings-page">{error}</PageSection>;
  }

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <PageSection className="settings-page">
      <SectionTitle
        title="Settings"
        subtitle="Workspace preferences and permissions live here."
      />
      <div className="settings-page__panel">
        Settings view placeholder for {project.name}.
      </div>
    </PageSection>
  );
};
