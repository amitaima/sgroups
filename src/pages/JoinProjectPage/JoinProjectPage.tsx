import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { Button } from "@components/ui/Button/Button";
import { getProjectById, updateProject } from "@services/firebase/firebase";
import { useAuth } from "@app/providers/AuthProvider";
import type { ProjectMemberRole } from "../../types/common";

export const JoinProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "joining" | "done" | "error">(
    "idle",
  );

  useEffect(() => {
    const doJoin = async () => {
      if (!projectId) return;
      setStatus("joining");

      try {
        const project = await getProjectById(projectId);
        if (!project) {
          setStatus("error");
          return;
        }

        // require authenticated user
        if (!user) {
          // redirect to login and preserve intended join url
          navigate(`/login`, { state: { from: `/join/${projectId}` } });
          return;
        }

        const nextMemberIds = Array.from(
          new Set([...(project.memberIds || []), user.uid]),
        );

        const nextMemberRoles: Record<string, ProjectMemberRole> = {
          ...(project.memberRoles || {}),
          [user.uid]: "member",
        };

        await updateProject(projectId, {
          memberIds: nextMemberIds,
          memberRoles: nextMemberRoles,
        });

        setStatus("done");
        navigate(`/projects/${projectId}`, { replace: true });
      } catch (e) {
        console.error("Join failed", e);
        setStatus("error");
      }
    };

    void doJoin();
  }, [projectId, navigate, user]);

  return (
    <PageSection className="join-page">
      <GlassPanel style={{ padding: "2rem" }}>
        {status === "joining" ? (
          <div>מנסה להצטרף לפרויקט...</div>
        ) : status === "error" ? (
          <div>אירעה שגיאה בניסיון להצטרף. אנא נסו שוב.</div>
        ) : null}
        <div style={{ marginTop: "1rem" }}>
          <Button type="button" onClick={() => navigate("/projects")}>
            חזור לפרויקטים
          </Button>
        </div>
      </GlassPanel>
    </PageSection>
  );
};

export default JoinProjectPage;
