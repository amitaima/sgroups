import { Button } from "@components/ui/Button/Button";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { MemberAvatarGroup } from "@components/users/MemberAvatarGroup";
import { Bell, CalendarDays } from "lucide-react";
import type { ProjectCardProps } from "./ProjectCard.types";
import "./ProjectCard.scss";

const statusLabelMap: Record<
  NonNullable<ProjectCardProps["project"]["status"]>,
  string
> = {
  active: "פעיל",
  completed: "הושלם",
  archived: "בארכיון",
};

const toneClasses = ["project-card--teal", "project-card--peach"] as const;

const getProjectInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "PR";

const getToneClass = (seed: string) => {
  const checksum = seed
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return toneClasses[checksum % toneClasses.length];
};

const formatDate = (value?: ProjectCardProps["project"]["dueDate"]) =>
  value ? value.toDate().toLocaleDateString("he-IL") : null;

export const ProjectCard = ({
  project,
  members,
  creatorLabel,
  score,
  onEnter,
}: ProjectCardProps) => {
  const status = project.status ?? "active";
  const toneClass = getToneClass(project.id || project.name);
  // const dueDate = formatDate(project.dueDate);
  const finalSubmissionDate = formatDate(project.finalSubmissionAt);

  return (
    <GlassPanel className={`project-card ${toneClass}`} intensity="strong">
      <div className="project-card__start">
        <div className="project-card__mark" aria-hidden="true">
          <span>{getProjectInitials(project.name)}</span>
        </div>

        <div className="project-card__copy">
          <div className="project-card__headline-row">
            <div className="project-card__title-group">
              <h3 className="project-card__title">{project.name}</h3>
              {typeof score === "number" ? (
                <span className="project-card__score-badge">
                  {score} pts
                </span>
              ) : null}
            </div>
            <span
              className={`project-card__status project-card__status--${status}`}
            >
              {statusLabelMap[status]}
            </span>
          </div>

          {project.description ? (
            <p className="project-card__description">{project.description}</p>
          ) : (
            <p className="project-card__description project-card__description--muted">
              עדיין לא נוסף תיאור לפרויקט.
            </p>
          )}

          <div className="project-card__members-row">
            <MemberAvatarGroup members={members} maxVisible={4} />
            <div className="project-card__meta-grid">
              {/* <div className="project-card__meta-item">
                <UsersRound size={16} strokeWidth={2} />
                <span>{members.length} חברי צוות</span>
              </div> */}

              {finalSubmissionDate ? (
                <div className="project-card__meta-item">
                  <CalendarDays size={16} strokeWidth={2} />
                  <span>הגשת הפרויקט: {finalSubmissionDate}</span>
                </div>
              ) : null}

              {project.notificationSettings &&
              Object.values(project.notificationSettings).some(Boolean) ? (
                <div className="project-card__meta-item project-card__meta-item--notification">
                  <Bell size={16} strokeWidth={2} />
                  <span>התראות פעילות</span>
                </div>
              ) : null}
            </div>
            {/* <span className="project-card__creator">
              נוצר על ידי {creatorLabel}
            </span> */}
          </div>
        </div>
      </div>

      <Button className="project-card__cta" onClick={onEnter} size="lg">
        כניסה לפרויקט
      </Button>
    </GlassPanel>
  );
};
