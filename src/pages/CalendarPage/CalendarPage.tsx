import { Navigate, useParams } from "react-router-dom";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import "./CalendarPage.scss";

export const CalendarPage = () => {
  const { projectId } = useParams();
  const { project, loading, error } = useWorkspaceProject(projectId);

  if (loading) {
    return (
      <PageSection className="calendar-page">Loading workspace...</PageSection>
    );
  }

  if (error) {
    return <PageSection className="calendar-page">{error}</PageSection>;
  }

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <PageSection className="calendar-page">
      <SectionTitle
        title="Calendar"
        subtitle="Shared scheduling surface coming next."
      />
      <div className="calendar-page__panel">
        Calendar view placeholder for {project.name}.
      </div>
    </PageSection>
  );
};
