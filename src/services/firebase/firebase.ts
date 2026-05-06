import { initializeApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth } from "firebase/auth";
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
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import type { Project } from "../../types/common";
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

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  createdAt: unknown;
  lastLoginAt: unknown;
}

export interface MemberDirectoryUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  dueDate?: Date;
  createdBy: string;
  memberIds?: string[];
  teacherIds?: string[];
  status?: "active" | "completed" | "archived";
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

export const upsertUserProfile = async (user: User): Promise<void> => {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  const existingCreatedAt = snapshot.exists()
    ? snapshot.data()?.createdAt
    : null;
  const provider = user.providerData[0]?.providerId || "password";

  const payload: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider,
    createdAt: existingCreatedAt ?? serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });
};

const PROJECTS_COLLECTION = "projects";
const USERS_COLLECTION = "users";
const PROJECT_CALENDAR_EVENTS_COLLECTION = "calendarEvents";

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
    description: data.description ? String(data.description) : undefined,
    dueDate: data.dueDate instanceof Timestamp ? data.dueDate : undefined,
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
    status:
      data.status === "completed" ||
      data.status === "archived" ||
      data.status === "active"
        ? data.status
        : "active",
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

const getProjectCalendarEventsCollection = (projectId: string) =>
  collection(
    db,
    PROJECTS_COLLECTION,
    projectId,
    PROJECT_CALENDAR_EVENTS_COLLECTION,
  );

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

export const createProject = async (
  input: CreateProjectInput,
): Promise<string> => {
  const normalizedMemberIds = Array.from(
    new Set([input.createdBy, ...(input.memberIds ?? [])].filter(Boolean)),
  );

  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || "",
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    createdBy: input.createdBy,
    memberIds: normalizedMemberIds,
    teacherIds: input.teacherIds ?? [],
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
