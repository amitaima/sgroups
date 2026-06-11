import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CalendarDays,
  Copy,
  Layers3,
  Link2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@app/providers/AuthProvider";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { Button } from "@components/ui/Button/Button";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { MemberAvatarGroup } from "@components/users/MemberAvatarGroup";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import type {
  Project,
  ProjectMemberRole,
  ProjectNotificationSettings,
  ProjectStatus,
  ProjectType,
} from "../../types/common";
import {
  deleteProject,
  getUsersByIds,
  reassignRemovedMemberTasks,
  resolveMemberIdsByEmails,
  updateProject,
} from "@services/firebase/firebase";
import "./SettingsPage.scss";

const PROJECT_TYPE_OPTIONS: Array<{ value: ProjectType; label: string }> = [
  { value: "seminar", label: "סמינריון" },
  { value: "assignment", label: "עבודה" },
  { value: "presentation", label: "מצגת" },
  { value: "research", label: "מחקר" },
  { value: "lab", label: "מעבדה" },
];

const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: "active", label: "פעיל" },
  { value: "completed", label: "הושלם" },
  { value: "archived", label: "בארכיון" },
];

const PROJECT_ROLE_OPTIONS: Array<{
  value: ProjectMemberRole;
  label: string;
}> = [
  { value: "owner", label: "בעלים" },
  { value: "faculty", label: "סגל" },
  { value: "member", label: "חבר צוות" },
];

interface MilestoneDraft {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

interface LinkDraft {
  id: string;
  label: string;
  url: string;
}

interface SettingsDraft {
  name: string;
  description: string;
  dueDate: string;
  finalSubmissionAt: string;
  nextMilestoneAt: string;
  projectType: ProjectType | "";
  status: ProjectStatus;
  courseName: string;
  institutionName: string;
  lecturerName: string;
  courseCode: string;
  semesterLabel: string;
  groupNumber: string;
  memberIds: string[];
  memberRoles: Record<string, ProjectMemberRole>;
  notificationEmail: boolean;
  notificationReminders: boolean;
  notificationMentions: boolean;
  milestones: MilestoneDraft[];
  importantLinks: LinkDraft[];
  trophyName: string;
}

interface SavePayload {
  name: string;
  description: string;
  dueDate: string;
  finalSubmissionAt: string;
  nextMilestoneAt: string;
  projectType: ProjectType | "";
  status: ProjectStatus;
  courseName: string;
  institutionName: string;
  lecturerName: string;
  courseCode: string;
  semesterLabel: string;
  groupNumber: string;
  memberIds: string[];
  memberRoles: Record<string, ProjectMemberRole>;
  notificationSettings: ProjectNotificationSettings;
  milestones: MilestoneDraft[];
  importantLinks: LinkDraft[];
  trophyName: string;
}

interface MemberRow {
  id: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  role: ProjectMemberRole;
  isCreator: boolean;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toDateInputValue = (timestamp?: Project["dueDate"]): string => {
  if (!timestamp) {
    return "";
  }

  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateInputValue = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T12:00:00`);
};

const formatReadableDate = (timestamp?: Project["dueDate"]): string => {
  if (!timestamp) {
    return "לא הוגדר";
  }

  return timestamp.toDate().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getProjectTypeLabel = (projectType?: ProjectType | "") => {
  if (!projectType) {
    return "לא הוגדר";
  }

  return (
    PROJECT_TYPE_OPTIONS.find((option) => option.value === projectType)
      ?.label ?? "לא הוגדר"
  );
};

const getStatusLabel = (status: ProjectStatus) =>
  PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  "פעיל";

const getRoleLabel = (role: ProjectMemberRole) =>
  PROJECT_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
  "חבר צוות";

const normalizeOptionalText = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : "";
};

const buildMemberRoles = (
  memberIds: string[],
  memberRoles: Record<string, ProjectMemberRole>,
  creatorId: string,
) => {
  const normalizedMemberIds = Array.from(
    new Set(
      [creatorId, ...memberIds].map((item) => item.trim()).filter(Boolean),
    ),
  );

  const normalizedRoles: Record<string, ProjectMemberRole> = {};

  Object.entries(memberRoles).forEach(([memberId, role]) => {
    if (
      normalizedMemberIds.includes(memberId) &&
      (role === "owner" || role === "faculty" || role === "member")
    ) {
      normalizedRoles[memberId] = role;
    }
  });

  normalizedRoles[creatorId] = "owner";

  normalizedMemberIds.forEach((memberId) => {
    if (!normalizedRoles[memberId]) {
      normalizedRoles[memberId] = memberId === creatorId ? "owner" : "member";
    }
  });

  return normalizedRoles;
};

const buildDraftFromProject = (project: Project): SettingsDraft => {
  const memberIds = Array.from(
    new Set(
      [project.createdBy, ...project.memberIds]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  const memberRoles = buildMemberRoles(
    memberIds,
    project.memberRoles ?? {},
    project.createdBy,
  );

  return {
    name: project.name,
    description: project.description ?? "",
    dueDate: toDateInputValue(project.dueDate),
    finalSubmissionAt: toDateInputValue(project.finalSubmissionAt),
    nextMilestoneAt: toDateInputValue(project.nextMilestoneAt),
    projectType: project.projectType ?? "",
    status: project.status ?? "active",
    courseName: project.courseName ?? "",
    institutionName: project.institutionName ?? "",
    lecturerName: project.lecturerName ?? "",
    courseCode: project.courseCode ?? "",
    semesterLabel: project.semesterLabel ?? "",
    groupNumber: project.groupNumber ?? "",
    memberIds,
    memberRoles,
    notificationEmail: project.notificationSettings?.email ?? false,
    notificationReminders: project.notificationSettings?.reminders ?? false,
    notificationMentions: project.notificationSettings?.mentions ?? false,
    milestones:
      project.milestones?.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        dueDate: toDateInputValue(milestone.dueDate),
        completed: Boolean(milestone.completed),
      })) ?? [],
    importantLinks:
      project.importantLinks?.map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
      })) ?? [],
    trophyName: project.trophyName ?? "",
  };
};

const buildSavePayload = (
  project: Project,
  draft: SettingsDraft,
): SavePayload => {
  const memberIds = Array.from(
    new Set(
      [project.createdBy, ...draft.memberIds]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  const memberRoles = buildMemberRoles(
    memberIds,
    draft.memberRoles,
    project.createdBy,
  );

  return {
    name: draft.name.trim(),
    description: draft.description,
    dueDate: draft.dueDate,
    finalSubmissionAt: draft.finalSubmissionAt,
    nextMilestoneAt: draft.nextMilestoneAt,
    projectType: draft.projectType,
    status: draft.status,
    courseName: draft.courseName,
    institutionName: draft.institutionName,
    lecturerName: draft.lecturerName,
    courseCode: draft.courseCode,
    semesterLabel: draft.semesterLabel,
    groupNumber: draft.groupNumber,
    memberIds,
    memberRoles,
    notificationSettings: {
      email: draft.notificationEmail,
      reminders: draft.notificationReminders,
      mentions: draft.notificationMentions,
    },
    milestones: draft.milestones,
    importantLinks: draft.importantLinks,
    trophyName: draft.trophyName,
  };
};

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectId } = useParams();
  const { project, loading, error } = useWorkspaceProject(projectId);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [memberDirectory, setMemberDirectory] = useState<
    Record<
      string,
      { displayName: string; email: string | null; photoURL: string | null }
    >
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [copyState, setCopyState] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- autosave / dirty tracking refs & state ---
  const initialGeneralRef = useRef<string | null>(null);
  const [dirtyGeneral, setDirtyGeneral] = useState(false);

  const lastSavedMilestonesRef = useRef<Record<string, string>>({});
  const milestoneSaveTimerRef = useRef<number | null>(null);

  const lastSavedMembersRef = useRef<string | null>(null);
  const memberSaveTimerRef = useRef<number | null>(null);

  const getGeneralSnapshot = useCallback((d: SettingsDraft | null) => {
    if (!d) return null;
    return JSON.stringify({
      name: d.name,
      description: d.description,
      dueDate: d.dueDate,
      finalSubmissionAt: d.finalSubmissionAt,
      nextMilestoneAt: d.nextMilestoneAt,
      projectType: d.projectType,
      status: d.status,
      courseName: d.courseName,
      institutionName: d.institutionName,
      lecturerName: d.lecturerName,
      courseCode: d.courseCode,
      semesterLabel: d.semesterLabel,
      groupNumber: d.groupNumber,
      trophyName: d.trophyName,
    });
  }, []);

  useEffect(() => {
    if (!project) {
      setDraft(null);
      setMemberDirectory({});
      setSaveError(null);
      setSaveSuccess(null);
      setInviteEmails("");
      setCopyState(null);
      return;
    }

    const nextDraft = buildDraftFromProject(project);
    setDraft(nextDraft);
    // initialize dirty tracking and last-saved refs to avoid immediate autosave
    initialGeneralRef.current = getGeneralSnapshot(nextDraft);
    setDirtyGeneral(false);

    // milestones
    lastSavedMilestonesRef.current = Object.fromEntries(
      (nextDraft.milestones || []).map((m) => [m.id, m.dueDate]),
    );

    // members
    lastSavedMembersRef.current = `${(nextDraft.memberIds || []).join("|")}|${JSON.stringify(nextDraft.memberRoles || {})}`;

    setSaveError(null);
    setSaveSuccess(null);
    setInviteEmails("");
    setCopyState(null);
  }, [project]);

  const memberIdsKey = draft?.memberIds.join("|") ?? "";

  useEffect(() => {
    let active = true;

    if (!draft?.memberIds.length) {
      setMemberDirectory({});
      return () => {
        active = false;
      };
    }

    void getUsersByIds(draft.memberIds)
      .then((members) => {
        if (!active) {
          return;
        }

        const nextMembers = members.reduce<
          Record<
            string,
            {
              displayName: string;
              email: string | null;
              photoURL: string | null;
            }
          >
        >((accumulator, member) => {
          accumulator[member.uid] = {
            displayName: member.displayName ?? member.email ?? member.uid,
            email: member.email,
            photoURL: member.photoURL,
          };

          return accumulator;
        }, {});

        setMemberDirectory(nextMembers);
      })
      .catch((membersError) => {
        if (!active) {
          return;
        }

        console.error("Failed to load project members", membersError);
      })
      .finally(() => {
        if (active) {
        }
      });

    return () => {
      active = false;
    };
  }, [memberIdsKey, draft?.memberIds]);

  // track whether general (non-members/milestones) fields have changed
  useEffect(() => {
    const snap = getGeneralSnapshot(draft);
    setDirtyGeneral(
      Boolean(
        initialGeneralRef.current && snap && initialGeneralRef.current !== snap,
      ),
    );
  }, [draft, getGeneralSnapshot]);

  // autosave milestone due dates (debounced)
  useEffect(() => {
    if (!project || !draft) return;

    const key = (draft.milestones || [])
      .map((m) => `${m.id}|${m.dueDate}`)
      .join(",");

    const hasChange = (draft.milestones || []).some(
      (m) => lastSavedMilestonesRef.current[m.id] !== m.dueDate,
    );

    if (!hasChange) return;

    if (milestoneSaveTimerRef.current) {
      clearTimeout(milestoneSaveTimerRef.current);
    }

    // debounce
    milestoneSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const milestonesPayload = (draft.milestones || [])
          .filter(
            (milestone) =>
              milestone.title.trim().length > 0 &&
              milestone.dueDate.trim().length > 0,
          )
          .map((milestone) => ({
            id: milestone.id,
            title: milestone.title.trim(),
            dueDate: fromDateInputValue(milestone.dueDate) ?? new Date(),
            completed: milestone.completed,
          }));

        await updateProject(project.id, { milestones: milestonesPayload });

        // update last-saved map
        lastSavedMilestonesRef.current = Object.fromEntries(
          (draft.milestones || []).map((m) => [m.id, m.dueDate]),
        );

        setSaveSuccess("תאריכי אבני הדרך נשמרו.");
      } catch (e) {
        console.error("Autosave milestones failed", e);
        setSaveError("לא הצלחנו לשמור את תאריכי אבני הדרך כרגע.");
      }
    }, 900);

    return () => {
      if (milestoneSaveTimerRef.current) {
        clearTimeout(milestoneSaveTimerRef.current);
      }
    };
  }, [project, draft?.milestones]);

  // autosave members (roles / additions / removals) (debounced)
  useEffect(() => {
    if (!project || !draft) return;

    const currentMembersKey = `${(draft.memberIds || []).join("|")}|${JSON.stringify(draft.memberRoles || {})}`;
    if (lastSavedMembersRef.current === currentMembersKey) return;

    if (memberSaveTimerRef.current) {
      clearTimeout(memberSaveTimerRef.current);
    }

    memberSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const memberIds = Array.from(
          new Set([project.createdBy, ...(draft.memberIds || [])]),
        );
        const memberRoles = buildMemberRoles(
          memberIds,
          draft.memberRoles || {},
          project.createdBy,
        );

        await updateProject(project.id, { memberIds, memberRoles });

        const removedIds = project.memberIds.filter((id) => !memberIds.includes(id));
        if (removedIds.length > 0) {
          await reassignRemovedMemberTasks(project.id, removedIds, memberIds);
        }

        lastSavedMembersRef.current = currentMembersKey;
        setSaveSuccess("שינויים בצוות נשמרו.");
      } catch (e) {
        console.error("Autosave members failed", e);
        setSaveError("לא הצלחנו לשמור שינויים בצוות כרגע.");
      }
    }, 700);

    return () => {
      if (memberSaveTimerRef.current) {
        clearTimeout(memberSaveTimerRef.current);
      }
    };
  }, [project, draft?.memberIds, draft?.memberRoles]);

  const currentUserRole = useMemo(() => {
    if (!project || !user) {
      return "member" as ProjectMemberRole;
    }

    if (project.createdBy === user.uid) {
      return "owner" as ProjectMemberRole;
    }

    return project.memberRoles?.[user.uid] ?? ("member" as ProjectMemberRole);
  }, [project, user]);

  const canManageTeam =
    currentUserRole === "owner" || currentUserRole === "faculty";

  const memberRows = useMemo<MemberRow[]>(() => {
    if (!project || !draft) {
      return [];
    }

    return draft.memberIds.map((memberId) => {
      const member = memberDirectory[memberId];
      const role =
        draft.memberRoles[memberId] ??
        (memberId === project.createdBy ? "owner" : "member");

      return {
        id: memberId,
        displayName: member?.displayName ?? memberId,
        email: member?.email ?? null,
        photoURL: member?.photoURL ?? null,
        role,
        isCreator: memberId === project.createdBy,
      };
    });
  }, [draft, memberDirectory, project]);

  const updateDraft = <K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) => {
    setDraft((currentDraft) =>
      currentDraft ? { ...currentDraft, [key]: value } : currentDraft,
    );
  };

  const updateMilestone = (
    milestoneId: string,
    value: Partial<MilestoneDraft>,
  ) => {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        milestones: currentDraft.milestones.map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, ...value } : milestone,
        ),
      };
    });
  };

  const addMilestone = () => {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        milestones: [
          ...currentDraft.milestones,
          { id: createId(), title: "", dueDate: "", completed: false },
        ],
      };
    });
  };

  const removeMilestone = (milestoneId: string) => {
    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            milestones: currentDraft.milestones.filter(
              (milestone) => milestone.id !== milestoneId,
            ),
          }
        : currentDraft,
    );
  };

  const handleSaveProject = async () => {
    if (!project || !draft) {
      return;
    }

    const projectName = draft.name.trim();
    if (!projectName) {
      setSaveError("יש להזין שם פרויקט.");
      return;
    }

    const dueDate = fromDateInputValue(draft.dueDate);
    const finalSubmissionAt = fromDateInputValue(draft.finalSubmissionAt);
    const nextMilestoneAt = fromDateInputValue(draft.nextMilestoneAt);

    if (dueDate && finalSubmissionAt && finalSubmissionAt < dueDate) {
      setSaveError("תאריך ההגשה הסופי חייב להיות אחרי תאריך היעד.");
      return;
    }

    const payload = buildSavePayload(project, draft);

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await updateProject(project.id, {
        name: projectName,
        description: normalizeOptionalText(payload.description),
        dueDate,
        finalSubmissionAt,
        nextMilestoneAt,
        projectType: payload.projectType || null,
        status: payload.status,
        courseName: normalizeOptionalText(payload.courseName),
        institutionName: normalizeOptionalText(payload.institutionName),
        lecturerName: normalizeOptionalText(payload.lecturerName),
        courseCode: normalizeOptionalText(payload.courseCode),
        semesterLabel: normalizeOptionalText(payload.semesterLabel),
        groupNumber: normalizeOptionalText(payload.groupNumber),
        trophyName: normalizeOptionalText(payload.trophyName),
        memberIds: payload.memberIds,
        memberRoles: payload.memberRoles,
        notificationSettings: payload.notificationSettings,
        milestones: payload.milestones
          .filter(
            (milestone) =>
              milestone.title.trim().length > 0 &&
              milestone.dueDate.trim().length > 0,
          )
          .map((milestone) => ({
            id: milestone.id,
            title: milestone.title.trim(),
            dueDate: fromDateInputValue(milestone.dueDate) ?? new Date(),
            completed: milestone.completed,
          })),
        importantLinks: payload.importantLinks,
      });

      setSaveSuccess("ההגדרות נשמרו בהצלחה.");
      setDirtyGeneral(false);
    } catch (saveProjectError) {
      console.error("Failed to save project settings", saveProjectError);
      setSaveError("לא הצלחנו לשמור את ההגדרות. נסו שוב.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!draft || !project) {
      return;
    }

    const nextStatus: ProjectStatus =
      draft.status === "archived" ? "active" : "archived";
    const previousStatus = draft.status;

    setDraft((currentDraft) =>
      currentDraft ? { ...currentDraft, status: nextStatus } : currentDraft,
    );

    try {
      await updateProject(project.id, { status: nextStatus });
      setSaveSuccess(
        nextStatus === "archived"
          ? "הפרויקט הועבר לארכיון."
          : "הפרויקט הוחזר למצב פעיל.",
      );
    } catch (archiveError) {
      console.error("Failed to update project status", archiveError);
      setDraft((currentDraft) =>
        currentDraft
          ? { ...currentDraft, status: previousStatus }
          : currentDraft,
      );
      setSaveError("לא הצלחנו לעדכן את סטטוס הפרויקט.");
    }
  };

  const openDeleteDialog = () => {
    setDeleteConfirmValue("");
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setDeleteConfirmValue("");
    setDeleteError(null);
  };

  const handleDeleteProject = async () => {
    if (!project) {
      return;
    }

    if (deleteConfirmValue.trim() !== project.name.trim()) {
      setDeleteError("יש להקליד את שם הפרויקט במדויק כדי למחוק אותו.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteProject(project.id);
      navigate("/projects", { replace: true });
    } catch (deleteProjectError) {
      console.error("Failed to delete project", deleteProjectError);
      setDeleteError("לא הצלחנו למחוק את הפרויקט. נסו שוב.");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <PageSection className="settings-page">טוען הגדרות פרויקט...</PageSection>
    );
  }

  if (error) {
    return <PageSection className="settings-page">{error}</PageSection>;
  }

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <PageSection className="settings-page" dir="rtl">
      <PageContainer size="lg">
        <div className="settings-page__hero">
          <SectionTitle
            title="הגדרות פרויקט"
            subtitle="ניהול פרטי הפרויקט, הצוות, אבני הדרך והעדפות העבודה המשותפת."
            actions={<div className="settings-page__hero-actions" />}
          />

          {saveError ? (
            <p className="settings-page__notice settings-page__notice--error">
              {saveError}
            </p>
          ) : null}
          {saveSuccess ? (
            <p className="settings-page__notice settings-page__notice--success">
              {saveSuccess}
            </p>
          ) : null}
          {copyState ? (
            <p className="settings-page__notice">{copyState}</p>
          ) : null}
        </div>

        <div className="settings-page__layout">
          <div className="settings-page__main">
            {/* LEAVE the comment */}
            {/* <GlassPanel
              className="settings-page__card settings-page__card--intro"
              intensity="strong"
            >
              <div className="settings-page__intro">
                <div>
                  <p className="settings-page__eyebrow">פרויקט פעיל</p>
                  <h2 className="settings-page__project-name">
                    {project.name}
                  </h2>
                  <p className="settings-page__project-subtitle">
                    {project.description ||
                      "אין תיאור עדיין. אפשר להוסיף אותו כאן."}
                  </p>
                </div>

                <div className="settings-page__status-box">
                  <span
                    className={`settings-page__status-pill settings-page__status-pill--${draft?.status ?? project.status ?? "active"}`}
                  >
                    {getStatusLabel(
                      draft?.status ?? project.status ?? "active",
                    )}
                  </span>
                </div>
              </div>
            </GlassPanel> */}

            <GlassPanel
              className="settings-page__card"
              style={{ position: "relative" }}
            >
              <div className="settings-page__card-header">
                <div>
                  <p className="settings-page__eyebrow">פרטי פרויקט</p>
                  <h3 className="settings-page__card-title">כללי</h3>
                </div>
                <CalendarDays size={18} strokeWidth={2.1} />
              </div>

              <div className="settings-page__form-grid">
                <label className="settings-page__field settings-page__field--wide">
                  <span>שם הפרויקט</span>
                  <input
                    type="text"
                    value={draft?.name ?? ""}
                    onChange={(event) =>
                      updateDraft("name", event.target.value)
                    }
                  />
                </label>

                <label className="settings-page__field settings-page__field--wide">
                  <span>תיאור הפרויקט</span>
                  <textarea
                    rows={4}
                    value={draft?.description ?? ""}
                    onChange={(event) =>
                      updateDraft("description", event.target.value)
                    }
                  />
                </label>

                <label className="settings-page__field settings-page__field--wide">
                  <span>פרס אלוף העבודה🏆 (אופציונלי)</span>
                  <input
                    type="text"
                    value={draft?.trophyName ?? ""}
                    onChange={(event) =>
                      updateDraft("trophyName", event.target.value)
                    }
                    placeholder="לדוגמה: ארוחת צהריים עלינו"
                  />
                </label>

                <label className="settings-page__field">
                  <span>סוג הפרויקט</span>
                  <select
                    value={draft?.projectType ?? ""}
                    onChange={(event) =>
                      updateDraft(
                        "projectType",
                        event.target.value as ProjectType | "",
                      )
                    }
                  >
                    <option value="">לא הוגדר</option>
                    {PROJECT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="settings-page__field">
                  <span>סטטוס הפרויקט</span>
                  <select
                    value={draft?.status ?? "active"}
                    onChange={(event) =>
                      updateDraft("status", event.target.value as ProjectStatus)
                    }
                  >
                    {PROJECT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="settings-page__field">
                  <span>תאריך הגשה סופי</span>
                  <input
                    type="date"
                    value={draft?.finalSubmissionAt ?? ""}
                    onChange={(event) =>
                      updateDraft("finalSubmissionAt", event.target.value)
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>תאריך יעד כללי</span>
                  <input
                    type="date"
                    value={draft?.dueDate ?? ""}
                    onChange={(event) =>
                      updateDraft("dueDate", event.target.value)
                    }
                  />
                </label>

                <label className="settings-page__field">
                  <span>קורס</span>
                  <input
                    type="text"
                    value={draft?.courseName ?? ""}
                    onChange={(event) =>
                      updateDraft("courseName", event.target.value)
                    }
                    placeholder="שם הקורס"
                  />
                </label>

                <label className="settings-page__field">
                  <span>מוסד / אוניברסיטה</span>
                  <input
                    type="text"
                    value={draft?.institutionName ?? ""}
                    onChange={(event) =>
                      updateDraft("institutionName", event.target.value)
                    }
                    placeholder="שם המוסד"
                  />
                </label>

                {/* <label className="settings-page__field">
                  <span>מרצה / מתרגל</span>
                  <input
                    type="text"
                    value={draft?.lecturerName ?? ""}
                    onChange={(event) =>
                      updateDraft("lecturerName", event.target.value)
                    }
                    placeholder="שם איש הסגל"
                  />
                </label> */}

                <label className="settings-page__field">
                  <span>מספר קורס</span>
                  <input
                    type="text"
                    value={draft?.courseCode ?? ""}
                    onChange={(event) =>
                      updateDraft("courseCode", event.target.value)
                    }
                    placeholder="לדוגמה: CS101"
                  />
                </label>

                <label className="settings-page__field">
                  <span>סמסטר / שנת לימודים</span>
                  <input
                    type="text"
                    value={draft?.semesterLabel ?? ""}
                    onChange={(event) =>
                      updateDraft("semesterLabel", event.target.value)
                    }
                    placeholder="סמסטר א׳ תשפ״ו"
                  />
                </label>

                <label className="settings-page__field">
                  <span>קבוצת לימוד / מספר קבוצה</span>
                  <input
                    type="text"
                    value={draft?.groupNumber ?? ""}
                    onChange={(event) =>
                      updateDraft("groupNumber", event.target.value)
                    }
                    placeholder="לדוגמה: קבוצה 4"
                  />
                </label>
              </div>

              {/* Floating save button for general info (bottom-left of card) */}
              {dirtyGeneral ? (
                <div
                  style={{
                    position: "absolute",
                    left: "1rem",
                    bottom: "1rem",
                  }}
                >
                  <Button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={isSaving}
                  >
                    <Save size={16} />
                    {isSaving ? "שומר..." : "שמור שינויים"}
                  </Button>
                </div>
              ) : null}
            </GlassPanel>

            <GlassPanel className="settings-page__card">
              <div className="settings-page__card-header">
                <div>
                  <p className="settings-page__eyebrow">אבני דרך</p>
                  <h3 className="settings-page__card-title">תאריכי ביניים</h3>
                </div>
                <Layers3 size={18} strokeWidth={2.1} />
              </div>

              {draft?.milestones.length ? (
                <div className="settings-page__stack">
                  {draft.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="settings-page__stack-item"
                    >
                      <label className="settings-page__field settings-page__field--wide">
                        <span>שם אבן הדרך</span>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(event) =>
                            updateMilestone(milestone.id, {
                              title: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="settings-page__field">
                        <span>תאריך</span>
                        <input
                          type="date"
                          value={milestone.dueDate}
                          onChange={(event) =>
                            updateMilestone(milestone.id, {
                              dueDate: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="settings-page__checkbox">
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          onChange={(event) =>
                            updateMilestone(milestone.id, {
                              completed: event.target.checked,
                            })
                          }
                        />
                        <span>סומן כהושלם</span>
                      </label>
                      <button
                        className="settings-page__stack-remove"
                        type="button"
                        onClick={() => removeMilestone(milestone.id)}
                        aria-label="הסרת אבן הדרך"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="settings-page__muted">
                  אין עדיין אבני דרך מוגדרות.
                </p>
              )}

              <Button
                style={{ width: "fit-content" }}
                type="button"
                variant="secondary"
                onClick={addMilestone}
              >
                <Plus size={16} />
                הוספת אבן דרך
              </Button>
            </GlassPanel>

            {canManageTeam && (
              <GlassPanel className="settings-page__card">
                <div className="settings-page__card-header">
                  <div>
                    <p className="settings-page__eyebrow">ניהול צוות</p>
                    <h3 className="settings-page__card-title">חברי הפרויקט</h3>
                  </div>
                  <Users size={18} strokeWidth={2.1} />
                </div>

                <div className="settings-page__stack">
                  {memberRows.map((member) => (
                    <div
                      key={member.id}
                      className="settings-page__stack-item settings-page__member-row"
                    >
                      <div className="settings-page__member-info">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt=""
                            className="settings-page__member-avatar"
                          />
                        ) : (
                          <span className="settings-page__member-avatar settings-page__member-avatar--placeholder">
                            {(member.displayName || "?").charAt(0)}
                          </span>
                        )}
                        <div>
                          <strong>{member.displayName}</strong>
                          {member.email && (
                            <span className="settings-page__member-email">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="settings-page__member-actions">
                        <select
                          value={draft?.memberRoles[member.id] ?? member.role}
                          disabled={member.isCreator}
                          onChange={(e) => {
                            if (!draft) return;
                            const nextRoles = {
                              ...draft.memberRoles,
                              [member.id]: e.target.value as ProjectMemberRole,
                            };
                            updateDraft("memberRoles", nextRoles);
                          }}
                        >
                          {PROJECT_ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {!member.isCreator && (
                          <button
                            className="settings-page__stack-remove"
                            type="button"
                            onClick={() => {
                              if (!draft) return;
                              const nextIds = draft.memberIds.filter(
                                (id) => id !== member.id,
                              );
                              const nextRoles = { ...draft.memberRoles };
                              delete nextRoles[member.id];
                              setDraft({
                                ...draft,
                                memberIds: nextIds,
                                memberRoles: nextRoles,
                              });
                            }}
                            aria-label={`הסרת ${member.displayName}`}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="settings-page__invite-row">
                  <input
                    type="email"
                    placeholder="הוספת חבר/ה לפי אימייל"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const email = inviteEmails.trim();
                        if (!email || !draft || !project) return;
                        void (async () => {
                          const { memberIds: resolved, missingEmails } =
                            await resolveMemberIdsByEmails([email]);
                          if (missingEmails.length > 0) {
                            setSaveError(
                              `לא נמצא משתמש עם המייל: ${missingEmails.join(", ")}`,
                            );
                            return;
                          }
                          const newId = resolved[0];
                          if (draft.memberIds.includes(newId)) return;
                          setDraft({
                            ...draft,
                            memberIds: [...draft.memberIds, newId],
                            memberRoles: {
                              ...draft.memberRoles,
                              [newId]: "member",
                            },
                          });
                          setInviteEmails("");
                        })();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const email = inviteEmails.trim();
                      if (!email || !draft || !project) return;
                      void (async () => {
                        const { memberIds: resolved, missingEmails } =
                          await resolveMemberIdsByEmails([email]);
                        if (missingEmails.length > 0) {
                          setSaveError(
                            `לא נמצא משתמש עם המייל: ${missingEmails.join(", ")}`,
                          );
                          return;
                        }
                        const newId = resolved[0];
                        if (draft.memberIds.includes(newId)) return;
                        setDraft({
                          ...draft,
                          memberIds: [...draft.memberIds, newId],
                          memberRoles: {
                            ...draft.memberRoles,
                            [newId]: "member",
                          },
                        });
                        setInviteEmails("");
                      })();
                    }}
                  >
                    <Plus size={16} />
                    הוספה
                  </Button>
                </div>
              </GlassPanel>
            )}

            {/* DONT TOUCH the comment */}
            {/* <GlassPanel className="settings-page__card">
              <div className="settings-page__card-header">
                <div>
                  <p className="settings-page__eyebrow">התראות ותזכורות</p>
                  <h3 className="settings-page__card-title">
                    התאמת קצב העבודה
                  </h3>
                </div>
                <ShieldCheck size={18} strokeWidth={2.1} />
              </div>

              <div className="settings-page__toggles">
                <label className="settings-page__toggle">
                  <div>
                    <strong>התראות באימייל</strong>
                    <p>שליחת עדכונים ופעילות חשובה למייל של הצוות.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft?.notificationEmail ?? false}
                    onChange={(event) =>
                      updateDraft("notificationEmail", event.target.checked)
                    }
                  />
                </label>

                <label className="settings-page__toggle">
                  <div>
                    <strong>תזכורות לאבני דרך</strong>
                    <p>תזכורות לפני מועד הגשה ואבני ביניים.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft?.notificationReminders ?? false}
                    onChange={(event) =>
                      updateDraft("notificationReminders", event.target.checked)
                    }
                  />
                </label>

                <label className="settings-page__toggle">
                  <div>
                    <strong>אזכורים והודעות צוות</strong>
                    <p>קבלת התראה כאשר מתייגים אתכם בהערות או בפעילות צוות.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft?.notificationMentions ?? false}
                    onChange={(event) =>
                      updateDraft("notificationMentions", event.target.checked)
                    }
                  />
                </label>
              </div>
            </GlassPanel> */}
          </div>

          <div className="settings-page__aside">
            <GlassPanel
              className="settings-page__card settings-page__card--summary"
              intensity="strong"
            >
              <div className="settings-page__card-header">
                <div>
                  <p className="settings-page__eyebrow">תצוגה כללית</p>
                  <h3 className="settings-page__card-title">
                    מבט מהיר על הפרויקט
                  </h3>
                </div>
              </div>

              <div className="settings-page__summary-list">
                <div>
                  <span>תאריך הגשה סופי</span>
                  <strong>
                    {formatReadableDate(project.finalSubmissionAt)}
                  </strong>
                </div>
                <div>
                  <span>אבן הדרך הבאה</span>
                  <strong>{formatReadableDate(project.nextMilestoneAt)}</strong>
                </div>
                <div>
                  <span>סוג הפרויקט</span>
                  <strong>
                    {getProjectTypeLabel(
                      draft?.projectType ?? project.projectType ?? "",
                    )}
                  </strong>
                </div>
                <div>
                  <span>קורס</span>
                  <strong>
                    {draft?.courseName || project.courseName || "לא הוגדר"}
                  </strong>
                </div>
                <div>
                  <span>חברי צוות</span>
                  <strong>
                    {draft?.memberIds.length ?? project.memberIds.length} חברים
                  </strong>
                </div>
              </div>

              <div className="settings-page__summary-members">
                <MemberAvatarGroup
                  members={memberRows.map((member) => ({
                    id: member.id,
                    displayName: member.displayName,
                    email: member.email,
                    photoURL: member.photoURL,
                  }))}
                  maxVisible={4}
                />
                <p>
                  {currentUserRole === "owner"
                    ? "אתם מוגדרים כבעלי הפרויקט."
                    : currentUserRole === "faculty"
                      ? "יש לכם הרשאות ניהול לצוות ולהגדרות."
                      : "יש לכם הרשאת צפייה ועריכה בסיסית בפרויקט."}
                </p>
              </div>
            </GlassPanel>

            <GlassPanel className="settings-page__card settings-page__danger">
              <div className="settings-page__card-header">
                <div>
                  <p className="settings-page__eyebrow">אזור מסוכן</p>
                  <h3 className="settings-page__card-title">פעולות רגישות</h3>
                </div>
                <Trash2 size={18} strokeWidth={2.1} />
              </div>

              <p className="settings-page__danger-copy">
                העברה לארכיון תשאיר את הנתונים זמינים לקריאה. מחיקה תמחק את
                הפרויקט ואת נתוני היומן המשויכים אליו לצמיתות.
              </p>

              <div className="settings-page__danger-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={toggleArchive}
                >
                  <Archive size={16} />
                  {draft?.status === "archived"
                    ? "הוצאה מהארכיון"
                    : "העברה לארכיון"}
                </Button>
                <button
                  className="settings-page__delete-button"
                  type="button"
                  onClick={openDeleteDialog}
                >
                  <Trash2 size={16} />
                  מחיקת פרויקט
                </button>
              </div>
            </GlassPanel>
          </div>
        </div>
      </PageContainer>

      {deleteDialogOpen ? (
        <div
          className="settings-page__dialog-backdrop"
          role="presentation"
          onClick={closeDeleteDialog}
        >
          <GlassPanel
            className="settings-page__dialog"
            intensity="strong"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-page__dialog-header">
              <div>
                <p className="settings-page__eyebrow">מחיקת פרויקט</p>
                <h3
                  id="project-delete-title"
                  className="settings-page__card-title"
                >
                  פעולה זו אינה ניתנת לביטול
                </h3>
              </div>
              <button
                className="settings-page__icon-button"
                type="button"
                onClick={closeDeleteDialog}
                aria-label="סגירת חלון המחיקה"
                disabled={isDeleting}
              >
                <X size={16} />
              </button>
            </div>

            <p className="settings-page__dialog-copy">
              כדי לאשר את המחיקה, יש להקליד את שם הפרויקט במדויק.
            </p>

            <label className="settings-page__field settings-page__field--wide">
              <span>שם הפרויקט</span>
              <input
                type="text"
                value={deleteConfirmValue}
                onChange={(event) => setDeleteConfirmValue(event.target.value)}
                placeholder={project.name}
              />
            </label>

            {deleteError ? (
              <p className="settings-page__notice settings-page__notice--error">
                {deleteError}
              </p>
            ) : null}

            <div className="settings-page__dialog-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
              >
                ביטול
              </Button>
              <button
                className="settings-page__delete-button settings-page__delete-button--confirm"
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeleting}
              >
                {isDeleting ? "מוחק..." : "מחק פרויקט לצמיתות"}
              </button>
            </div>
          </GlassPanel>
        </div>
      ) : null}
    </PageSection>
  );
};
