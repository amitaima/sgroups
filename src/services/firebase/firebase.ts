import { initializeApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth, updateProfile as updateAuthProfile } from "firebase/auth";
import {
  addDoc,
  deleteDoc,
  collection,
  type DocumentData,
  type DocumentSnapshot,
  documentId,
  doc,
  getDocs,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import type {
  Project,
  ProjectLink,
  ProjectMemberRole,
  ProjectMilestone,
  ProjectNotificationSettings,
  ProjectStatus,
  ProjectType,
  TaskDifficulty,
  TaskPriority,
  TaskStatus,
  ThemeMode,
  UserAcademicProfile,
  UserLinks,
  UserNotificationPreferences,
} from "../../types/common";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const ai = getAI(app, { backend: new GoogleAIBackend() });
export const taskSuggestionModel = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
});

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  theme: ThemeMode;
  notifications: UserNotificationPreferences;
  academicProfile?: UserAcademicProfile;
  links?: UserLinks;
  provider: string;
  createdAt: unknown;
  lastLoginAt: unknown;
  previousLoginAt: unknown;
}

export interface MemberDirectoryUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const USER_THEMES: ThemeMode[] = ["light", "dark", "system"];

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && USER_THEMES.includes(value as ThemeMode);

const getUserDocRef = (uid: string) => doc(db, "users", uid);

const normalizeUserText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const getNotificationPreferences = (
  value: unknown,
): UserNotificationPreferences => {
  if (!value || typeof value !== "object") {
    return {
      deadlineReminders: false,
      taskActivityNotifications: false,
    };
  }

  const data = value as Record<string, unknown>;

  return {
    deadlineReminders: Boolean(data.deadlineReminders),
    taskActivityNotifications: Boolean(data.taskActivityNotifications),
  };
};

const getAcademicProfile = (
  value: unknown,
): UserAcademicProfile | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as Record<string, unknown>;
  const university = normalizeUserText(data.university);
  const department = normalizeUserText(data.department);
  const studyYear = normalizeUserText(data.studyYear);

  if (!university && !department && !studyYear) {
    return undefined;
  }

  return {
    university,
    department,
    studyYear,
  };
};

const getUserLinks = (value: unknown): UserLinks | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as Record<string, unknown>;
  const links = {
    googleDrive: normalizeUserText(data.googleDrive),
    github: normalizeUserText(data.github),
    linkedin: normalizeUserText(data.linkedin),
    portfolio: normalizeUserText(data.portfolio),
  };

  if (
    !links.googleDrive &&
    !links.github &&
    !links.linkedin &&
    !links.portfolio
  ) {
    return undefined;
  }

  return links;
};

const getUserTheme = (value: unknown): ThemeMode =>
  isThemeMode(value) ? value : "system";

export interface CreateProjectInput {
  name: string;
  description?: string;
  dueDate?: Date;
  finalSubmissionAt?: Date;
  nextMilestoneAt?: Date;
  projectType?: ProjectType;
  courseName?: string;
  institutionName?: string;
  lecturerName?: string;
  courseCode?: string;
  semesterLabel?: string;
  groupNumber?: string;
  importantLinks?: Array<{ id: string; label: string; url: string }>;
  milestones?: Array<{
    id: string;
    title: string;
    dueDate: Date;
    completed?: boolean;
  }>;
  notificationSettings?: ProjectNotificationSettings;
  createdBy: string;
  memberIds?: string[];
  memberScores?: Record<string, number>;
  teacherIds?: string[];
  memberRoles?: Record<string, ProjectMemberRole>;
  status?: "active" | "completed" | "archived";
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  dueDate?: Date | null;
  finalSubmissionAt?: Date | null;
  nextMilestoneAt?: Date | null;
  projectType?: ProjectType | null;
  courseName?: string | null;
  institutionName?: string | null;
  lecturerName?: string | null;
  courseCode?: string | null;
  semesterLabel?: string | null;
  groupNumber?: string | null;
  importantLinks?: Array<{ id: string; label: string; url: string }>;
  milestones?: Array<{
    id: string;
    title: string;
    dueDate: Date;
    completed?: boolean;
  }>;
  notificationSettings?: ProjectNotificationSettings;
  memberIds?: string[];
  memberScores?: Record<string, number>;
  memberRoles?: Record<string, ProjectMemberRole>;
  teacherIds?: string[];
  status?: ProjectStatus;
}

export type CalendarEventAudience = "selected" | "everyone";

export interface CalendarEventRecord {
  id: string;
  projectId: string;
  title: string;
  startDate: Timestamp;
  endDate: Timestamp;
  time: string | null;
  description: string | null;
  location: string | null;
  ownerId: string;
  assigneeIds: string[];
  audience: CalendarEventAudience;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateCalendarEventInput {
  title: string;
  startDate: Date;
  endDate: Date;
  time?: string;
  description?: string;
  location?: string;
  ownerId: string;
  assigneeIds: string[];
  audience: CalendarEventAudience;
  createdBy: string;
}

export interface ProjectTaskRecord {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  dueDate: Timestamp | null;
  assigneeIds: string[];
  completed: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateProjectTaskInput {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  difficulty?: TaskDifficulty;
  status?: TaskStatus;
  dueDate?: Date | null;
  assigneeIds?: string[];
  completed?: boolean;
  createdBy: string;
}

export interface UpdateProjectTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  difficulty?: TaskDifficulty;
  status?: TaskStatus;
  dueDate?: Date | null;
  assigneeIds?: string[];
  completed?: boolean;
}

export type AiSummarySource = "loginActivity" | "taskBoard";

export interface SaveAiSummaryInput {
  userId: string;
  projectId?: string | null;
  source: AiSummarySource;
  headline: string;
  summaryLines: string[];
  highlights: string[];
  nextFocus: string;
  context?: Record<string, unknown>;
}
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snapshot = await getDoc(getUserDocRef(uid));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
};

export const upsertUserProfile = async (user: User): Promise<void> => {
  const ref = getUserDocRef(user.uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.exists() ? snapshot.data() : null;
  const existingCreatedAt = data?.createdAt ?? null;
  const existingTheme = getUserTheme(data?.theme);
  const existingNotifications = getNotificationPreferences(data?.notifications);
  const existingAcademicProfile = getAcademicProfile(data?.academicProfile);
  const existingLinks = getUserLinks(data?.links);
  const existingLastLoginAt = data?.lastLoginAt ?? null;
  const provider = user.providerData[0]?.providerId || "password";

  const payload: Record<string, unknown> = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    theme: existingTheme,
    notifications: existingNotifications,
    provider,
    createdAt: existingCreatedAt ?? serverTimestamp(),
    previousLoginAt: existingLastLoginAt,
    lastLoginAt: serverTimestamp(),
  };

  if (existingAcademicProfile !== undefined) {
    payload.academicProfile = existingAcademicProfile;
  }

  if (existingLinks !== undefined) {
    payload.links = existingLinks;
  }

  await setDoc(ref, payload, { merge: true });
};

export const updateUserThemePreference = async (
  uid: string,
  theme: ThemeMode,
): Promise<void> => {
  await setDoc(getUserDocRef(uid), { theme }, { merge: true });
};

export const updateUserNotificationPreferences = async (
  uid: string,
  notifications: UserNotificationPreferences,
): Promise<void> => {
  await setDoc(getUserDocRef(uid), { notifications }, { merge: true });
};

export const updateUserAcademicProfile = async (
  uid: string,
  academicProfile: UserAcademicProfile,
): Promise<void> => {
  await setDoc(getUserDocRef(uid), { academicProfile }, { merge: true });
};

export const updateUserLinks = async (
  uid: string,
  links: UserLinks,
): Promise<void> => {
  await setDoc(getUserDocRef(uid), { links }, { merge: true });
};

export const updateUserDisplayProfile = async (
  uid: string,
  profile: { displayName?: string; photoURL?: string },
): Promise<void> => {
  const payload: Record<string, unknown> = {};

  if (profile.displayName !== undefined) {
    payload.displayName = profile.displayName;
  }

  if (profile.photoURL !== undefined) {
    payload.photoURL = profile.photoURL;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  await setDoc(getUserDocRef(uid), payload, { merge: true });

  if (auth.currentUser) {
    await updateAuthProfile(auth.currentUser, {
      displayName: profile.displayName ?? null,
      photoURL: profile.photoURL ?? null,
    });
  }
};

export const uploadUserAvatar = async (
  uid: string,
  file: File,
): Promise<string> => {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() || "png"
    : "png";
  const avatarRef = storageRef(storage, `users/${uid}/avatar.${extension}`);

  await uploadBytes(avatarRef, file);
  const downloadUrl = await getDownloadURL(avatarRef);

  await updateUserDisplayProfile(uid, { photoURL: downloadUrl });

  return downloadUrl;
};



const PROJECTS_COLLECTION = "projects";
const USERS_COLLECTION = "users";
const PROJECT_CALENDAR_EVENTS_COLLECTION = "calendarEvents";
const PROJECT_TASKS_COLLECTION = "tasks";
const AI_SUMMARIES_COLLECTION = "aiSummaries";

const isProjectStatus = (value: unknown): value is ProjectStatus =>
  value === "active" || value === "completed" || value === "archived";

const isProjectType = (value: unknown): value is ProjectType =>
  value === "seminar" ||
  value === "assignment" ||
  value === "presentation" ||
  value === "research" ||
  value === "lab";

const isTaskPriority = (value: unknown): value is TaskPriority =>
  value === "high" || value === "medium" || value === "low";

const isTaskDifficulty = (value: unknown): value is TaskDifficulty =>
  value === "easy" || value === "medium" || value === "hard";

const isTaskStatus = (value: unknown): value is TaskStatus =>
  value === "todo" ||
  value === "inProgress" ||
  value === "review" ||
  value === "completed";

const isProjectMemberRole = (value: unknown): value is ProjectMemberRole =>
  value === "owner" || value === "faculty" || value === "member";

const normalizeText = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const toTimestamp = (value: unknown): Timestamp | undefined => {
  if (value instanceof Timestamp) {
    return value;
  }

  return undefined;
};

const mapProjectLinks = (value: unknown): ProjectLink[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const links = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const data = item as Record<string, unknown>;
      const id = normalizeText(data.id) ?? "";
      const label = normalizeText(data.label) ?? "";
      const url = normalizeText(data.url) ?? "";

      if (!id || !label || !url) {
        return null;
      }

      return { id, label, url };
    })
    .filter((link): link is ProjectLink => Boolean(link));

  return links.length > 0 ? links : undefined;
};

const mapProjectMilestones = (
  value: unknown,
): ProjectMilestone[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const milestones = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const data = item as Record<string, unknown>;
      const id = normalizeText(data.id) ?? "";
      const title = normalizeText(data.title) ?? "";
      const dueDate = toTimestamp(data.dueDate);

      if (!id || !title || !dueDate) {
        return null;
      }

      return {
        id,
        title,
        dueDate,
        completed: Boolean(data.completed),
      };
    })
    .filter((milestone) => milestone !== null) as ProjectMilestone[];

  return milestones.length > 0 ? milestones : undefined;
};

const mapMemberRoles = (
  value: unknown,
): Record<string, ProjectMemberRole> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>).reduce<
    Record<string, ProjectMemberRole>
  >((accumulator, [memberId, role]) => {
    if (normalizeText(memberId) && isProjectMemberRole(role)) {
      accumulator[memberId] = role;
    }

    return accumulator;
  }, {});

  return Object.keys(entries).length > 0 ? entries : undefined;
};

const normalizeMemberIds = (memberIds: string[]) =>
  Array.from(new Set(memberIds.map((item) => item.trim()).filter(Boolean)));

const serializeProjectLinks = (
  value: Array<{ id: string; label: string; url: string }>,
) =>
  value
    .map((link) => ({
      id: link.id.trim(),
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.id && link.label && link.url);

const serializeProjectMilestones = (
  value: Array<{
    id: string;
    title: string;
    dueDate: Date;
    completed?: boolean;
  }>,
) =>
  value
    .map((milestone) => ({
      id: milestone.id.trim(),
      title: milestone.title.trim(),
      dueDate: Timestamp.fromDate(milestone.dueDate),
      completed: Boolean(milestone.completed),
    }))
    .filter((milestone) => milestone.id && milestone.title);

const normalizeProjectRoleMap = (
  memberIds: string[],
  memberRoles?: Record<string, ProjectMemberRole>,
  createdBy?: string,
) => {
  const normalizedMemberIds = normalizeMemberIds(memberIds);
  const roles = Object.entries(memberRoles ?? {}).reduce<
    Record<string, ProjectMemberRole>
  >((accumulator, [memberId, role]) => {
    if (normalizedMemberIds.includes(memberId) && isProjectMemberRole(role)) {
      accumulator[memberId] = role;
    }

    return accumulator;
  }, {});

  if (createdBy) {
    roles[createdBy] = "owner";
  }

  normalizedMemberIds.forEach((memberId) => {
    if (!roles[memberId]) {
      roles[memberId] = memberId === createdBy ? "owner" : "member";
    }
  });

  return roles;
};

const mapProjectMemberScores = (
  value: unknown,
): Record<string, number> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const scores = Object.entries(value as Record<string, unknown>).reduce<
    Record<string, number>
  >((accumulator, [memberId, score]) => {
    if (
      typeof memberId === "string" &&
      typeof score === "number" &&
      Number.isFinite(score) &&
      score >= 0
    ) {
      accumulator[memberId] = score;
    }
    return accumulator;
  }, {});

  return Object.keys(scores).length > 0 ? scores : undefined;
};

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < arr.length; index += size) {
    chunks.push(arr.slice(index, index + size));
  }
  return chunks;
};

const mapProjectSnapshot = (
  snapshot: DocumentSnapshot<DocumentData>,
): Project | null => {
  if (!snapshot.exists()) {
    return null;
  }

  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    description: normalizeText(data.description),
    dueDate: toTimestamp(data.dueDate),
    finalSubmissionAt: toTimestamp(data.finalSubmissionAt),
    nextMilestoneAt: toTimestamp(data.nextMilestoneAt),
    projectType: isProjectType(data.projectType) ? data.projectType : undefined,
    courseName: normalizeText(data.courseName),
    institutionName: normalizeText(data.institutionName),
    lecturerName: normalizeText(data.lecturerName),
    courseCode: normalizeText(data.courseCode),
    semesterLabel: normalizeText(data.semesterLabel),
    groupNumber: normalizeText(data.groupNumber),
    importantLinks: mapProjectLinks(data.importantLinks),
    milestones: mapProjectMilestones(data.milestones),
    memberScores: mapProjectMemberScores(data.memberScores),
    notificationSettings: (() => {
      if (
        !data.notificationSettings ||
        typeof data.notificationSettings !== "object"
      ) {
        return undefined;
      }

      const notificationSettingsData = data.notificationSettings as Record<
        string,
        unknown
      >;

      return {
        email:
          typeof notificationSettingsData.email === "boolean"
            ? notificationSettingsData.email
            : undefined,
        reminders:
          typeof notificationSettingsData.reminders === "boolean"
            ? notificationSettingsData.reminders
            : undefined,
        mentions:
          typeof notificationSettingsData.mentions === "boolean"
            ? notificationSettingsData.mentions
            : undefined,
      };
    })(),
    memberRoles: mapMemberRoles(data.memberRoles),
    createdBy: String(data.createdBy ?? ""),
    memberIds: Array.isArray(data.memberIds)
      ? data.memberIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    teacherIds: Array.isArray(data.teacherIds)
      ? data.teacherIds.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt
        : Timestamp.fromDate(new Date()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt
        : Timestamp.fromDate(new Date()),
    status: isProjectStatus(data.status) ? data.status : "active",
  };
};

const mapCalendarEventSnapshot = (
  snapshot: DocumentSnapshot<DocumentData>,
  projectId: string,
): CalendarEventRecord | null => {
  if (!snapshot.exists()) {
    return null;
  }

  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  const assigneeIds = Array.isArray(data.assigneeIds)
    ? data.assigneeIds.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const ownerId =
    typeof data.ownerId === "string" && data.ownerId.trim().length > 0
      ? data.ownerId
      : typeof data.createdBy === "string" && data.createdBy.trim().length > 0
        ? data.createdBy
        : (assigneeIds[0] ?? "");

  return {
    id: snapshot.id,
    projectId,
    title: String(data.title ?? ""),
    startDate:
      data.startDate instanceof Timestamp
        ? data.startDate
        : Timestamp.fromDate(new Date()),
    endDate:
      data.endDate instanceof Timestamp
        ? data.endDate
        : Timestamp.fromDate(new Date()),
    time:
      typeof data.time === "string" && data.time.trim().length > 0
        ? data.time
        : null,
    description:
      typeof data.description === "string" && data.description.trim().length > 0
        ? data.description
        : null,
    location:
      typeof data.location === "string" && data.location.trim().length > 0
        ? data.location
        : null,
    ownerId,
    assigneeIds:
      assigneeIds.length > 0 ? assigneeIds : ownerId ? [ownerId] : [],
    audience: data.audience === "everyone" ? "everyone" : "selected",
    createdBy: String(data.createdBy ?? ownerId ?? ""),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt
        : Timestamp.fromDate(new Date()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt
        : Timestamp.fromDate(new Date()),
  };
};

const mapProjectTaskSnapshot = (
  snapshot: DocumentSnapshot<DocumentData>,
  projectId: string,
): ProjectTaskRecord | null => {
  if (!snapshot.exists()) {
    return null;
  }

  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  const status = isTaskStatus(data.status) ? data.status : "todo";
  const priority = isTaskPriority(data.priority) ? data.priority : "medium";
  const difficulty = isTaskDifficulty(data.difficulty)
    ? data.difficulty
    : "medium";
  const assigneeIds = Array.isArray(data.assigneeIds)
    ? data.assigneeIds.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const createdBy =
    typeof data.createdBy === "string" && data.createdBy.trim().length > 0
      ? data.createdBy
      : (assigneeIds[0] ?? "");
  const completed =
    typeof data.completed === "boolean"
      ? data.completed
      : status === "completed";

  return {
    id: snapshot.id,
    projectId,
    title: String(data.title ?? ""),
    description:
      typeof data.description === "string" && data.description.trim().length > 0
        ? data.description
        : null,
    priority,
    difficulty,
    status,
    dueDate: toTimestamp(data.dueDate) ?? null,
    assigneeIds:
      assigneeIds.length > 0 ? assigneeIds : createdBy ? [createdBy] : [],
    completed,
    createdBy,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt
        : Timestamp.fromDate(new Date()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt
        : Timestamp.fromDate(new Date()),
  };
};

const getProjectCalendarEventsCollection = (projectId: string) =>
  collection(
    db,
    PROJECTS_COLLECTION,
    projectId,
    PROJECT_CALENDAR_EVENTS_COLLECTION,
  );

const getProjectTasksCollection = (projectId: string) =>
  collection(db, PROJECTS_COLLECTION, projectId, PROJECT_TASKS_COLLECTION);

const normalizeEventAssignees = (
  assigneeIds: string[],
  ownerId: string,
  audience: CalendarEventAudience,
) => {
  if (audience === "everyone") {
    return [];
  }

  const normalizedIds = Array.from(
    new Set(assigneeIds.map((item) => item.trim()).filter(Boolean)),
  );

  if (normalizedIds.length > 0) {
    return normalizedIds;
  }

  return ownerId ? [ownerId] : [];
};

const normalizeTaskAssignees = (assigneeIds: string[]) =>
  Array.from(new Set(assigneeIds.map((item) => item.trim()).filter(Boolean)));

const sortProjectTasks = (tasks: ProjectTaskRecord[]) =>
  [...tasks].sort((left, right) => {
    const statusOrder: Record<TaskStatus, number> = {
      todo: 0,
      inProgress: 1,
      review: 2,
      completed: 3,
    };

    if (statusOrder[left.status] !== statusOrder[right.status]) {
      return statusOrder[left.status] - statusOrder[right.status];
    }

    const leftDue = left.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;
    const rightDue = right.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;

    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    return left.title.localeCompare(right.title, "he");
  });

const taskDifficultyScore: Record<TaskDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
};

const calculateTaskScore = (task: ProjectTaskRecord): number => {
  if (task.status !== "completed") {
    return 0;
  }

  return taskDifficultyScore[task.difficulty] ?? taskDifficultyScore.medium;
};

const calculateProjectMemberScores = (
  tasks: ProjectTaskRecord[],
): Record<string, number> => {
  return tasks.reduce<Record<string, number>>((scores, task) => {
    if (task.status !== "completed") {
      return scores;
    }

    const taskPoints = calculateTaskScore(task);
    task.assigneeIds.forEach((memberId) => {
      if (!memberId) {
        return;
      }

      scores[memberId] = (scores[memberId] ?? 0) + taskPoints;
    });

    return scores;
  }, {});
};

const syncProjectMemberScores = async (
  projectId: string,
): Promise<void> => {
  const tasks = await getProjectTasks(projectId);
  const memberScores = calculateProjectMemberScores(tasks);

  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), {
    memberScores,
    updatedAt: serverTimestamp(),
  });
};

export const saveAiSummary = async (
  input: SaveAiSummaryInput,
): Promise<string> => {
  const docRef = await addDoc(collection(db, AI_SUMMARIES_COLLECTION), {
    userId: input.userId,
    projectId: input.projectId ?? null,
    source: input.source,
    headline: input.headline,
    summaryLines: input.summaryLines,
    highlights: input.highlights,
    nextFocus: input.nextFocus,
    context: input.context ?? {},
    createdAt: serverTimestamp(),
  });

  return docRef.id;
};
export const getProjectTasks = async (
  projectId: string,
): Promise<ProjectTaskRecord[]> => {
  const snapshot = await getDocs(getProjectTasksCollection(projectId));
  const tasks = snapshot.docs
    .map((docSnapshot) => mapProjectTaskSnapshot(docSnapshot, projectId))
    .filter((task): task is ProjectTaskRecord => Boolean(task));

  return sortProjectTasks(tasks);
};

export const subscribeProjectTasks = (
  projectId: string,
  onChange: (tasks: ProjectTaskRecord[]) => void,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    getProjectTasksCollection(projectId),
    (snapshot) => {
      const tasks = snapshot.docs
        .map((docSnapshot) => mapProjectTaskSnapshot(docSnapshot, projectId))
        .filter((task): task is ProjectTaskRecord => Boolean(task));

      onChange(sortProjectTasks(tasks));
    },
    (error) => {
      onError?.(error);
    },
  );

export const createProjectTask = async (
  projectId: string,
  input: CreateProjectTaskInput,
): Promise<string> => {
  const payload = {
    projectId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: input.priority,
    difficulty: input.difficulty ?? "medium",
    status: input.status ?? "todo",
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    assigneeIds: normalizeTaskAssignees(input.assigneeIds ?? []),
    completed: input.completed ?? input.status === "completed",
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(getProjectTasksCollection(projectId), payload);

  await syncProjectMemberScores(projectId);
  return docRef.id;
};

export const updateProjectTask = async (
  projectId: string,
  taskId: string,
  input: UpdateProjectTaskInput,
): Promise<void> => {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof input.title === "string") {
    payload.title = input.title.trim();
  }

  if (input.description !== undefined) {
    payload.description = normalizeText(input.description) ?? null;
  }

  if (input.priority) {
    payload.priority = input.priority;
  }

  if (input.difficulty) {
    payload.difficulty = input.difficulty;
  }

  if (input.status) {
    payload.status = input.status;
  }

  if (input.dueDate !== undefined) {
    payload.dueDate = input.dueDate ? Timestamp.fromDate(input.dueDate) : null;
  }

  if (Array.isArray(input.assigneeIds)) {
    payload.assigneeIds = normalizeTaskAssignees(input.assigneeIds);
  }

  if (typeof input.completed === "boolean") {
    payload.completed = input.completed;
  }

  if (typeof input.status === "string") {
    payload.completed = input.status === "completed";
  }

  await updateDoc(doc(getProjectTasksCollection(projectId), taskId), payload);
  await syncProjectMemberScores(projectId);
};

export const deleteProjectTask = async (
  projectId: string,
  taskId: string,
): Promise<void> => {
  await deleteDoc(doc(getProjectTasksCollection(projectId), taskId));
  await syncProjectMemberScores(projectId);
};

export const createProject = async (
  input: CreateProjectInput,
): Promise<string> => {
  const normalizedMemberIds = normalizeMemberIds([
    input.createdBy,
    ...(input.memberIds ?? []),
  ]);

  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || "",
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    finalSubmissionAt: input.finalSubmissionAt
      ? Timestamp.fromDate(input.finalSubmissionAt)
      : null,
    nextMilestoneAt: input.nextMilestoneAt
      ? Timestamp.fromDate(input.nextMilestoneAt)
      : null,
    projectType: input.projectType ?? null,
    courseName: input.courseName?.trim() || "",
    institutionName: input.institutionName?.trim() || "",
    lecturerName: input.lecturerName?.trim() || "",
    courseCode: input.courseCode?.trim() || "",
    semesterLabel: input.semesterLabel?.trim() || "",
    groupNumber: input.groupNumber?.trim() || "",
    importantLinks: serializeProjectLinks(input.importantLinks ?? []),
    milestones: serializeProjectMilestones(input.milestones ?? []),
    notificationSettings: input.notificationSettings ?? {
      email: false,
      reminders: false,
      mentions: false,
    },
    createdBy: input.createdBy,
    memberIds: normalizedMemberIds,
    memberScores: normalizedMemberIds.reduce<Record<string, number>>(
      (scores, memberId) => {
        scores[memberId] = 0;
        return scores;
      },
      {},
    ),
    teacherIds: input.teacherIds ?? [],
    memberRoles: normalizeProjectRoleMap(
      normalizedMemberIds,
      input.memberRoles,
      input.createdBy,
    ),
    status: input.status ?? "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), payload);
  return docRef.id;
};

export const getUserProjects = async (userId: string): Promise<Project[]> => {
  const projectsQuery = query(
    collection(db, PROJECTS_COLLECTION),
    where("memberIds", "array-contains", userId),
  );
  const snapshot = await getDocs(projectsQuery);

  const projects = snapshot.docs
    .map((docSnapshot) => mapProjectSnapshot(docSnapshot))
    .filter((project): project is Project => Boolean(project));

  projects.sort(
    (left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis(),
  );

  return projects;
};

export const getProjectById = async (
  projectId: string,
): Promise<Project | null> => {
  const snapshot = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
  return mapProjectSnapshot(snapshot);
};

export const updateProject = async (
  projectId: string,
  input: UpdateProjectInput,
): Promise<void> => {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof input.name === "string") {
    payload.name = input.name.trim();
  }

  if (input.description !== undefined) {
    payload.description = normalizeText(input.description) ?? null;
  }

  if (input.dueDate !== undefined) {
    payload.dueDate = input.dueDate ? Timestamp.fromDate(input.dueDate) : null;
  }

  if (input.finalSubmissionAt !== undefined) {
    payload.finalSubmissionAt = input.finalSubmissionAt
      ? Timestamp.fromDate(input.finalSubmissionAt)
      : null;
  }

  if (input.nextMilestoneAt !== undefined) {
    payload.nextMilestoneAt = input.nextMilestoneAt
      ? Timestamp.fromDate(input.nextMilestoneAt)
      : null;
  }

  if (input.projectType !== undefined) {
    payload.projectType = input.projectType ?? null;
  }

  if (input.courseName !== undefined) {
    payload.courseName = normalizeText(input.courseName) ?? null;
  }

  if (input.institutionName !== undefined) {
    payload.institutionName = normalizeText(input.institutionName) ?? null;
  }

  if (input.lecturerName !== undefined) {
    payload.lecturerName = normalizeText(input.lecturerName) ?? null;
  }

  if (input.courseCode !== undefined) {
    payload.courseCode = normalizeText(input.courseCode) ?? null;
  }

  if (input.semesterLabel !== undefined) {
    payload.semesterLabel = normalizeText(input.semesterLabel) ?? null;
  }

  if (input.groupNumber !== undefined) {
    payload.groupNumber = normalizeText(input.groupNumber) ?? null;
  }

  if (input.importantLinks !== undefined) {
    payload.importantLinks = serializeProjectLinks(input.importantLinks);
  }

  if (input.milestones !== undefined) {
    payload.milestones = serializeProjectMilestones(input.milestones);
  }

  if (input.notificationSettings !== undefined) {
    payload.notificationSettings = {
      email: Boolean(input.notificationSettings.email),
      reminders: Boolean(input.notificationSettings.reminders),
      mentions: Boolean(input.notificationSettings.mentions),
    };
  }

  if (input.memberIds !== undefined) {
    payload.memberIds = normalizeMemberIds(input.memberIds);
  }

  if (input.memberScores !== undefined) {
    payload.memberScores = input.memberScores;
  }

  if (input.memberRoles !== undefined) {
    payload.memberRoles = normalizeProjectRoleMap(
      input.memberIds ?? [],
      input.memberRoles,
    );
  }

  if (input.teacherIds !== undefined) {
    payload.teacherIds = Array.from(
      new Set(
        input.teacherIds.map((teacherId) => teacherId.trim()).filter(Boolean),
      ),
    );
  }

  if (input.status !== undefined) {
    payload.status = input.status;
  }

  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), payload);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const eventsSnapshot = await getDocs(
    getProjectCalendarEventsCollection(projectId),
  );

  await Promise.all(
    eventsSnapshot.docs.map((eventSnapshot) =>
      deleteDoc(
        doc(getProjectCalendarEventsCollection(projectId), eventSnapshot.id),
      ),
    ),
  );

  await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
};

export const getProjectCalendarEvents = async (
  projectId: string,
): Promise<CalendarEventRecord[]> => {
  const snapshot = await getDocs(getProjectCalendarEventsCollection(projectId));

  return snapshot.docs
    .map((docSnapshot) => mapCalendarEventSnapshot(docSnapshot, projectId))
    .filter((event): event is CalendarEventRecord => Boolean(event))
    .sort(
      (left, right) => left.startDate.toMillis() - right.startDate.toMillis(),
    );
};

export const createProjectCalendarEvent = async (
  projectId: string,
  input: CreateCalendarEventInput,
): Promise<string> => {
  const payload = {
    projectId,
    title: input.title.trim(),
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    time: input.time?.trim() || null,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    ownerId: input.ownerId,
    assigneeIds: normalizeEventAssignees(
      input.assigneeIds,
      input.ownerId,
      input.audience,
    ),
    audience: input.audience,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    getProjectCalendarEventsCollection(projectId),
    payload,
  );
  return docRef.id;
};

export const updateProjectCalendarEvent = async (
  projectId: string,
  eventId: string,
  input: Partial<CreateCalendarEventInput>,
): Promise<void> => {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof input.title === "string") {
    payload.title = input.title.trim();
  }

  if (input.startDate) {
    payload.startDate = Timestamp.fromDate(input.startDate);
  }

  if (input.endDate) {
    payload.endDate = Timestamp.fromDate(input.endDate);
  }

  if (typeof input.time === "string") {
    payload.time = input.time.trim() || null;
  }

  if (typeof input.description === "string") {
    payload.description = input.description.trim() || null;
  }

  if (typeof input.location === "string") {
    payload.location = input.location.trim() || null;
  }

  if (typeof input.ownerId === "string") {
    payload.ownerId = input.ownerId;
  }

  if (Array.isArray(input.assigneeIds)) {
    payload.assigneeIds = normalizeEventAssignees(
      input.assigneeIds,
      input.ownerId ?? "",
      input.audience ?? "selected",
    );
  }

  if (input.audience) {
    payload.audience = input.audience;
  }

  if (typeof input.createdBy === "string") {
    payload.createdBy = input.createdBy;
  }

  await updateDoc(
    doc(getProjectCalendarEventsCollection(projectId), eventId),
    payload,
  );
};

export const deleteProjectCalendarEvent = async (
  projectId: string,
  eventId: string,
): Promise<void> => {
  await deleteDoc(doc(getProjectCalendarEventsCollection(projectId), eventId));
};

export const getUsersByIds = async (
  userIds: string[],
): Promise<MemberDirectoryUser[]> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) {
    return [];
  }

  const batches = chunkArray(uniqueUserIds, 10);
  const snapshots = await Promise.all(
    batches.map((batch) =>
      getDocs(
        query(
          collection(db, USERS_COLLECTION),
          where(documentId(), "in", batch),
        ),
      ),
    ),
  );

  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((userDoc) => {
      const data = userDoc.data();
      return {
        uid: userDoc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
      };
    }),
  );
};

export const resolveMemberIdsByEmails = async (
  emails: string[],
): Promise<{ memberIds: string[]; missingEmails: string[] }> => {
  const normalizedEmails = Array.from(
    new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0),
    ),
  );

  if (!normalizedEmails.length) {
    return { memberIds: [], missingEmails: [] };
  }

  const batches = chunkArray(normalizedEmails, 10);
  const snapshots = await Promise.all(
    batches.map((batch) =>
      getDocs(
        query(collection(db, USERS_COLLECTION), where("email", "in", batch)),
      ),
    ),
  );

  const foundUsers = snapshots.flatMap((snapshot) =>
    snapshot.docs.map((userDoc) => {
      const data = userDoc.data();
      const email =
        typeof data.email === "string" ? data.email.toLowerCase() : "";
      return {
        uid: userDoc.id,
        email,
      };
    }),
  );

  const foundEmailSet = new Set(
    foundUsers.map((user) => user.email).filter(Boolean),
  );
  const missingEmails = normalizedEmails.filter(
    (email) => !foundEmailSet.has(email),
  );
  const memberIds = Array.from(new Set(foundUsers.map((user) => user.uid)));

  return { memberIds, missingEmails };
};


