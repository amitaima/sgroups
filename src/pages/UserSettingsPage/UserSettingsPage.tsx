import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@app/providers/AuthProvider";
import { useTheme } from "@app/providers/ThemeProvider";
import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { Button } from "@components/ui/Button/Button";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import {
  db,
  updateUserAcademicProfile,
  updateUserDisplayProfile,
  updateUserLinks,
  updateUserNotificationPreferences,
  uploadUserAvatar,
} from "@services/firebase/firebase";
import type {
  ThemeMode,
  UserAcademicProfile,
  UserLinks,
  UserNotificationPreferences,
} from "../../types/common";
import {
  ArrowRight,
  BellRing,
  BookOpenText,
  Camera,
  Github,
  Globe2,
  GraduationCap,
  ImageUp,
  Linkedin,
  Link2,
  MonitorSmartphone,
  MoonStar,
  Save,
  School2,
  SunMedium,
  UserRound,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import type { UserSettingsDraft } from "./UserSettingsPage.types";
import "./UserSettingsPage.scss";

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "light",
    label: "בהיר",
    description: "מראה בהיר ונקי לעבודה יומיומית.",
    icon: <SunMedium size={18} strokeWidth={2} />,
  },
  {
    value: "dark",
    label: "כהה",
    description: "מראה כהה ונעים לשעות הערב.",
    icon: <MoonStar size={18} strokeWidth={2} />,
  },
  {
    value: "system",
    label: "מערכת",
    description: "מתאים את עצמו להעדפת מערכת ההפעלה.",
    icon: <MonitorSmartphone size={18} strokeWidth={2} />,
  },
];

const STUDY_YEAR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "1", label: "שנה א'" },
  { value: "2", label: "שנה ב'" },
  { value: "3", label: "שנה ג'" },
  { value: "4", label: "שנה ד'" },
  { value: "masters", label: "תואר שני" },
  { value: "phd", label: "דוקטורט" },
  { value: "other", label: "אחר" },
];

const createEmptySettings = (
  user: ReturnType<typeof useAuth>["user"],
): UserSettingsDraft => ({
  profile: {
    fullName: user?.displayName || user?.email || "",
    avatarUrl: user?.photoURL || "",
  },
  academicProfile: {
    university: "",
    department: "",
    studyYear: "",
  },
  notifications: {
    deadlineReminders: false,
    taskActivityNotifications: false,
  },
  links: {
    googleDrive: "",
    github: "",
    linkedin: "",
    portfolio: "",
  },
});

const normalizeText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
};

const normalizeBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const normalizeDocumentSettings = (
  data: Record<string, unknown> | undefined,
  user: ReturnType<typeof useAuth>["user"],
): UserSettingsDraft => {
  const academicProfileData =
    data?.academicProfile && typeof data.academicProfile === "object"
      ? (data.academicProfile as Record<string, unknown>)
      : undefined;
  const notificationsData =
    data?.notifications && typeof data.notifications === "object"
      ? (data.notifications as Record<string, unknown>)
      : undefined;
  const linksData =
    data?.links && typeof data.links === "object"
      ? (data.links as Record<string, unknown>)
      : undefined;

  return {
    profile: {
      fullName: normalizeText(
        data?.displayName,
        user?.displayName || user?.email || "",
      ),
      avatarUrl: normalizeText(data?.photoURL, user?.photoURL || ""),
    },
    academicProfile: {
      university: normalizeText(academicProfileData?.university),
      department: normalizeText(academicProfileData?.department),
      studyYear: normalizeText(academicProfileData?.studyYear),
    },
    notifications: {
      deadlineReminders: normalizeBoolean(
        notificationsData?.deadlineReminders,
        false,
      ),
      taskActivityNotifications: normalizeBoolean(
        notificationsData?.taskActivityNotifications,
        false,
      ),
    },
    links: {
      googleDrive: normalizeText(linksData?.googleDrive),
      github: normalizeText(linksData?.github),
      linkedin: normalizeText(linksData?.linkedin),
      portfolio: normalizeText(linksData?.portfolio),
    },
  };
};

const getInitials = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "SG";
  }

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

interface FieldProps {
  label: string;
  className?: string;
  icon?: ReactNode;
  helperText?: string;
  children: ReactNode;
}

const Field = ({
  label,
  className,
  icon,
  helperText,
  children,
}: FieldProps) => (
  <label className={`user-settings-page__field ${className || ""}`}>
    <span className="user-settings-page__field-label-row">
      {icon ? (
        <span className="user-settings-page__field-icon">{icon}</span>
      ) : null}
      <span className="user-settings-page__field-label">{label}</span>
    </span>
    {children}
    {helperText ? (
      <span className="user-settings-page__field-helper">{helperText}</span>
    ) : null}
  </label>
);

interface SectionCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

const SectionCard = ({
  title,
  subtitle,
  actions,
  wide,
  children,
}: SectionCardProps) => (
  <GlassPanel
    className={`user-settings-page__card${wide ? " user-settings-page__card--wide" : ""}`}
    intensity="strong"
  >
    <SectionTitle title={title} subtitle={subtitle} actions={actions} />
    {children}
  </GlassPanel>
);

export const UserSettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<UserSettingsDraft>(() =>
    createEmptySettings(user),
  );
  const [savedDraft, setSavedDraft] = useState<UserSettingsDraft>(() =>
    createEmptySettings(user),
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUserSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const snapshot = await getDoc(doc(db, "users", user.uid));
      const data = snapshot.exists()
        ? (snapshot.data() as Record<string, unknown>)
        : undefined;
      const nextDraft = normalizeDocumentSettings(data, user);

      if (cancelled) {
        return;
      }

      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setLoading(false);
    };

    void loadUserSettings();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      return undefined;
    }

    const preview = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(preview);

    return () => URL.revokeObjectURL(preview);
  }, [avatarFile]);

  const profileDirty =
    draft.profile.fullName.trim() !== savedDraft.profile.fullName.trim() ||
    Boolean(avatarFile) ||
    draft.profile.avatarUrl !== savedDraft.profile.avatarUrl;

  const academicDirty =
    draft.academicProfile.university !==
      savedDraft.academicProfile.university ||
    draft.academicProfile.department !==
      savedDraft.academicProfile.department ||
    draft.academicProfile.studyYear !== savedDraft.academicProfile.studyYear;

  const linksDirty =
    draft.links.googleDrive !== savedDraft.links.googleDrive ||
    draft.links.github !== savedDraft.links.github ||
    draft.links.linkedin !== savedDraft.links.linkedin ||
    draft.links.portfolio !== savedDraft.links.portfolio;

  const profileAvatarSource = avatarPreviewUrl ?? draft.profile.avatarUrl;

  const handleBack = () => {
    const historyIndex = window.history.state?.idx;

    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/projects", { replace: true });
  };

  const handleProfileChange = (
    field: keyof UserSettingsDraft["profile"],
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }));
  };

  const handleAcademicChange = (
    field: keyof UserSettingsDraft["academicProfile"],
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      academicProfile: {
        ...current.academicProfile,
        [field]: value,
      },
    }));
  };

  const handleLinkChange = (
    field: keyof UserSettingsDraft["links"],
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      links: {
        ...current.links,
        [field]: value,
      },
    }));
  };

  const handleAvatarUploadClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarFile(file);
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    void setThemeMode(nextTheme);
  };

  const handleNotificationChange = async (
    field: keyof UserNotificationPreferences,
    value: boolean,
  ) => {
    if (!user) {
      return;
    }

    const nextNotifications = {
      ...draft.notifications,
      [field]: value,
    };

    setDraft((current) => ({
      ...current,
      notifications: nextNotifications,
    }));

    try {
      await updateUserNotificationPreferences(user.uid, nextNotifications);
      setSavedDraft((current) => ({
        ...current,
        notifications: nextNotifications,
      }));
    } catch (error) {
      console.error("Failed to persist notification preferences", error);
    }
  };

  const handleProfileSave = async () => {
    if (!user) {
      return;
    }

    const normalizedName = draft.profile.fullName.trim();

    if (!normalizedName) {
      return;
    }

    setSavingProfile(true);

    try {
      let nextAvatarUrl = draft.profile.avatarUrl;

      if (avatarFile) {
        nextAvatarUrl = await uploadUserAvatar(user.uid, avatarFile);
      }

      await updateUserDisplayProfile(user.uid, {
        displayName: normalizedName,
        photoURL: nextAvatarUrl,
      });

      const nextProfile = {
        fullName: normalizedName,
        avatarUrl: nextAvatarUrl,
      };

      setDraft((current) => ({
        ...current,
        profile: nextProfile,
      }));
      setSavedDraft((current) => ({
        ...current,
        profile: nextProfile,
      }));
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
    } catch (error) {
      console.error("Failed to persist profile settings", error);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAcademicSave = async () => {
    if (!user) {
      return;
    }

    setSavingAcademic(true);

    try {
      const nextAcademicProfile: UserAcademicProfile = {
        university: draft.academicProfile.university.trim(),
        department: draft.academicProfile.department.trim(),
        studyYear: draft.academicProfile.studyYear.trim(),
      };

      await updateUserAcademicProfile(user.uid, nextAcademicProfile);

      setSavedDraft((current) => ({
        ...current,
        academicProfile: nextAcademicProfile,
      }));
      setDraft((current) => ({
        ...current,
        academicProfile: nextAcademicProfile,
      }));
    } catch (error) {
      console.error("Failed to persist academic profile", error);
    } finally {
      setSavingAcademic(false);
    }
  };

  const handleLinksSave = async () => {
    if (!user) {
      return;
    }

    setSavingLinks(true);

    try {
      const nextLinks: UserLinks = {
        googleDrive: draft.links.googleDrive.trim(),
        github: draft.links.github.trim(),
        linkedin: draft.links.linkedin.trim(),
        portfolio: draft.links.portfolio.trim(),
      };

      await updateUserLinks(user.uid, nextLinks);

      setSavedDraft((current) => ({
        ...current,
        links: nextLinks,
      }));
      setDraft((current) => ({
        ...current,
        links: nextLinks,
      }));
    } catch (error) {
      console.error("Failed to persist links", error);
    } finally {
      setSavingLinks(false);
    }
  };

  const profileActions = profileDirty ? (
    <Button
      type="button"
      onClick={() => void handleProfileSave()}
      disabled={savingProfile || !draft.profile.fullName.trim()}
    >
      <Save size={15} strokeWidth={2} />
      {savingProfile ? "שומר..." : "שמירת פרופיל"}
    </Button>
  ) : null;

  const academicActions = academicDirty ? (
    <Button
      type="button"
      onClick={() => void handleAcademicSave()}
      disabled={savingAcademic}
    >
      <Save size={15} strokeWidth={2} />
      {savingAcademic ? "שומר..." : "שמירת לימודים"}
    </Button>
  ) : null;

  const linksActions = linksDirty ? (
    <Button
      type="button"
      onClick={() => void handleLinksSave()}
      disabled={savingLinks}
    >
      <Save size={15} strokeWidth={2} />
      {savingLinks ? "שומר..." : "שמירת קישורים"}
    </Button>
  ) : null;

  return (
    <PageSection className="user-settings-page">
      <PageContainer>
        <div className="user-settings-page__shell">
          <div className="user-settings-page__hero">
            <div className="user-settings-page__hero-actions">
              <Button type="button" variant="secondary" onClick={handleBack}>
                <ArrowRight size={16} strokeWidth={2} />
                חזרה
              </Button>
            </div>
            <div className="user-settings-page__hero-copy">
              <h1 className="user-settings-page__title">
                פרופיל והעדפות חשבון
              </h1>
              <p className="user-settings-page__subtitle">
                ההעדפות כאן שייכות לחשבון המשתמש שלך בלבד, ולא לפרויקט מסוים.
              </p>
            </div>
          </div>

          <div className="user-settings-page__grid">
            <SectionCard title="פרופיל" actions={profileActions}>
              <div className="user-settings-page__profile-layout">
                <div className="user-settings-page__avatar-block">
                  <div className="user-settings-page__avatar-shell cursor-pointer">
                    <div
                      className="user-settings-page__avatar"
                      aria-hidden="true"
                      onClick={handleAvatarUploadClick}
                    >
                      {profileAvatarSource ? (
                        <img
                          className="user-settings-page__avatar-image"
                          src={profileAvatarSource}
                          alt={draft.profile.fullName ||"תמונת פרופיל"}
                        />
                      ) : (
                        <span className="user-settings-page__avatar-initials">
                          {getInitials(draft.profile.fullName)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="user-settings-page__avatar-upload"
                      onClick={handleAvatarUploadClick}
                    >
                      <span className="user-settings-page__avatar-upload-icon">
                        <Camera size={16} strokeWidth={2} />
                      </span>
                    </button>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="user-settings-page__avatar-input"
                      onChange={handleAvatarFileChange}
                    />
                  </div>

                  <div className="user-settings-page__avatar-copy">
                    <strong>{draft.profile.fullName || "שם המשתמש"}</strong>
                    <span>
                      {/* Shiuold show here email */}
                      {/* {draft.profile.email || "כתובת אימייל"} */}
                    </span>
                  </div>
                </div>

                <div className="user-settings-page__profile-fields">
                  <Field
                    label="שם מלא"
                    icon={<UserRound size={16} strokeWidth={2} />}
                  >
                    <input
                      type="text"
                      value={draft.profile.fullName}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          profile: {
                            ...current.profile,
                            fullName: event.target.value,
                          },
                        }))
                      }
                      placeholder="לדוגמה: נועה כהן"
                    />
                  </Field>

                  {/* <Field
                    label="תמונה נבחרת"
                    icon={<ImageUp size={16} strokeWidth={2} />}
                    helperText="לחצי על כפתור ההחלפה מעל התמונה כדי לבחור קובץ חדש."
                  >
                    <input
                      type="text"
                      value={avatarFile?.name ?? draft.profile.avatarUrl}
                      readOnly
                      placeholder="לא נבחר קובץ"
                    />
                  </Field> */}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="פרופיל אקדמי" actions={academicActions}>
              <div className="user-settings-page__field-grid">
                <Field
                  label="אוניברסיטה / מכללה"
                  className="user-settings-page__card--wide"
                  icon={<School2 size={16} strokeWidth={2} />}
                >
                  <input
                    type="text"
                    value={draft.academicProfile.university}
                    onChange={(event) =>
                      handleAcademicChange("university", event.target.value)
                    }
                    placeholder="האוניברסיטה העברית"
                  />
                </Field>

                <Field
                  label="מה לומדים"
                  icon={<BookOpenText size={16} strokeWidth={2} />}
                >
                  <input
                    type="text"
                    value={draft.academicProfile.department}
                    onChange={(event) =>
                      handleAcademicChange("department", event.target.value)
                    }
                    placeholder="מדעי המחשב"
                  />
                </Field>

                <Field
                  label="שנת לימוד"
                  icon={<GraduationCap size={16} strokeWidth={2} />}
                >
                  <select
                    value={draft.academicProfile.studyYear}
                    onChange={(event) =>
                      handleAcademicChange("studyYear", event.target.value)
                    }
                  >
                    <option value="">בחרי שנה</option>
                    {STUDY_YEAR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="מראה">
              <div
                className="user-settings-page__theme-grid"
                role="radiogroup"
                aria-label="מצב ערכת נושא"
              >
                {THEME_OPTIONS.map((option) => {
                  const isSelected = themeMode === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`user-settings-page__theme-option${isSelected ? " is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="themeMode"
                        value={option.value}
                        checked={isSelected}
                        onChange={() => handleThemeChange(option.value)}
                      />
                      <span className="user-settings-page__theme-option-icon">
                        {option.icon}
                      </span>
                      <span className="user-settings-page__theme-option-body">
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="התראות">
              <div className="user-settings-page__toggle-list">
                <label className="user-settings-page__toggle-item">
                  <input
                    type="checkbox"
                    checked={draft.notifications.deadlineReminders}
                    onChange={(event) =>
                      void handleNotificationChange(
                        "deadlineReminders",
                        event.target.checked,
                      )
                    }
                  />
                  <span className="user-settings-page__toggle-copy">
                    <strong>
                      <BellRing size={15} strokeWidth={2} />
                      <span>תזכורות לדדליינים</span>
                    </strong>
                    <span>קבלת תזכורות לפני מועדי הגשה חשובים.</span>
                  </span>
                </label>

                <label className="user-settings-page__toggle-item">
                  <input
                    type="checkbox"
                    checked={draft.notifications.taskActivityNotifications}
                    onChange={(event) =>
                      void handleNotificationChange(
                        "taskActivityNotifications",
                        event.target.checked,
                      )
                    }
                  />
                  <span className="user-settings-page__toggle-copy">
                    <strong>
                      <BellRing size={15} strokeWidth={2} />
                      <span>התראות משימה ופעילות</span>
                    </strong>
                    <span>עדכונים כשיש שינוי במשימות או בפעילות קבוצתית.</span>
                  </span>
                </label>
              </div>
            </SectionCard>

            <SectionCard title="קישורים" actions={linksActions} wide>
              <div className="user-settings-page__links-grid">
                <Field
                  label="Google Drive"
                  icon={<Link2 size={16} strokeWidth={2} />}
                  helperText="מסמכים, שיתופים וקבצים משותפים."
                >
                  <input
                    type="url"
                    value={draft.links.googleDrive}
                    onChange={(event) =>
                      handleLinkChange("googleDrive", event.target.value)
                    }
                    placeholder="https://drive.google.com/..."
                  />
                </Field>

                <Field
                  label="GitHub"
                  icon={<Github size={16} strokeWidth={2} />}
                  helperText="מאגרי קוד, תרגילים ופרויקטים."
                >
                  <input
                    type="url"
                    value={draft.links.github}
                    onChange={(event) =>
                      handleLinkChange("github", event.target.value)
                    }
                    placeholder="https://github.com/username"
                  />
                </Field>

                <Field
                  label="LinkedIn"
                  icon={<Linkedin size={16} strokeWidth={2} />}
                  helperText="פרופיל מקצועי, קשרים והמלצות."
                >
                  <input
                    type="url"
                    value={draft.links.linkedin}
                    onChange={(event) =>
                      handleLinkChange("linkedin", event.target.value)
                    }
                    placeholder="https://linkedin.com/in/username"
                  />
                </Field>

                <Field
                  label="Scholar / פורטפוליו / אתר"
                  icon={<Globe2 size={16} strokeWidth={2} />}
                  helperText="כל קישור נוסף שמייצג אותך אקדמית או מקצועית."
                >
                  <input
                    type="url"
                    value={draft.links.portfolio}
                    onChange={(event) =>
                      handleLinkChange("portfolio", event.target.value)
                    }
                    placeholder="https://your-site.com"
                  />
                </Field>
              </div>
            </SectionCard>
          </div>
        </div>
      </PageContainer>
    </PageSection>
  );
};
