import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@app/providers/AuthProvider";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { Button } from "@components/ui/Button/Button";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { MemberAvatarGroup } from "@components/users/MemberAvatarGroup";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import type {
  CalendarEventAudience,
  CalendarEventRecord,
  MemberDirectoryUser,
} from "@services/firebase/firebase";
import {
  createProjectCalendarEvent,
  deleteProjectCalendarEvent,
  getProjectCalendarEvents,
  getUsersByIds,
} from "@services/firebase/firebase";
import type { Project } from "../../types/common";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import "./CalendarPage.scss";

type CalendarItemKind = "event" | "deadline";

type CalendarItemTone = "meeting" | "deadline" | "team";

interface CalendarDisplayItem {
  id: string;
  kind: CalendarItemKind;
  tone: CalendarItemTone;
  title: string;
  date: Date;
  startDate: Date;
  endDate: Date;
  timeLabel: string;
  meridiem?: "AM" | "PM";
  description?: string | null;
  location?: string | null;
  assigneeIds?: string[];
  ownerId?: string;
  audience?: CalendarEventAudience;
  accentId?: string;
}

interface EventFormState {
  title: string;
  startDate: string;
  endDate: string;
  time: string;
  description: string;
  location: string;
  audience: CalendarEventAudience;
  assigneeIds: string[];
}

const WEEKDAY_LABELS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];
const ACCENT_CLASSES = [
  "calendar-page__accent--teal",
  "calendar-page__accent--olive",
  "calendar-page__accent--peach",
  "calendar-page__accent--sage",
  "calendar-page__accent--gold",
] as const;

const hashString = (value: string) =>
  value.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toMonthStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const getMonthTitle = (date: Date) =>
  date.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

const getWeekdayTitle = (date: Date) =>
  date.toLocaleDateString("he-IL", {
    weekday: "long",
  });

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const sameDate = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getCalendarCells = (month: Date) => {
  const monthStart = toMonthStart(month);
  const firstDayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstDayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    return cellDate;
  });
};

const parseDateInputValue = (value: string, time: string) => {
  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart) - 1;
  const day = Number(dayPart);

  const date = new Date(year, month, day, 0, 0, 0, 0);

  if (time) {
    const [hoursPart, minutesPart] = time.split(":");
    date.setHours(Number(hoursPart), Number(minutesPart), 0, 0);
  }

  return date;
};

const formatClockParts = (
  date: Date,
): {
  timeLabel: string;
  meridiem: "AM" | "PM";
} => {
  const hours = date.getHours();
  const meridiem: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return {
    timeLabel: `${String(normalizedHours).padStart(2, "0")}:${minutes}`,
    meridiem,
  };
};

const formatTimeInputValue = (
  value: string,
): {
  timeLabel: string;
  meridiem: "AM" | "PM";
} => {
  const [hoursPart, minutesPart] = value.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const meridiem: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return {
    timeLabel: `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    meridiem,
  };
};

const getInitialFocusDate = () => new Date();

const getDeadlineItems = (project: Project): CalendarDisplayItem[] => {
  const seenKeys = new Set<string>();
  const items: CalendarDisplayItem[] = [];

  const addDeadline = (
    id: string,
    title: string,
    timestamp?:
      | Project["nextMilestoneAt"]
      | Project["finalSubmissionAt"]
      | Project["dueDate"],
  ) => {
    if (!timestamp) {
      return;
    }

    const date = timestamp.toDate();
    const key = `${id}-${date.getTime()}`;
    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    const { timeLabel, meridiem } = formatClockParts(date);

    items.push({
      id,
      kind: "deadline",
      tone: "deadline",
      title,
      date,
      startDate: date,
      endDate: date,
      timeLabel,
      meridiem,
      description: null,
      location: null,
      accentId: "deadline",
    });
  };

  addDeadline("next-milestone", "דדליין ציון דרך", project.nextMilestoneAt);
  addDeadline("final-submission", "דדליין סופי", project.finalSubmissionAt);

  if (
    project.dueDate &&
    project.dueDate.toMillis() !== project.finalSubmissionAt?.toMillis()
  ) {
    addDeadline("project-due-date", "תאריך הגשת פרויקט", project.dueDate);
  }

  return items.sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
};
const getParticipantAccentClass = (
  accentId?: string,
  tone?: CalendarItemTone,
) => {
  if (tone === "deadline") {
    return "calendar-page__accent--deadline";
  }

  if (!accentId || accentId === "team") {
    return "calendar-page__accent--team";
  }

  return ACCENT_CLASSES[hashString(accentId) % ACCENT_CLASSES.length];
};

const mapRecordToDisplayItem = (
  record: CalendarEventRecord,
): CalendarDisplayItem => {
  const startDate = record.startDate.toDate();
  const endDate = record.endDate.toDate();
  const accentId =
    record.audience === "everyone"
      ? "team"
      : (record.assigneeIds[0] ?? record.ownerId ?? record.createdBy);

  const timeParts = record.time
    ? formatTimeInputValue(record.time)
    : formatClockParts(startDate);

  return {
    id: record.id,
    kind: "event",
    tone: record.audience === "everyone" ? "team" : "meeting",
    title: record.title,
    date: startDate,
    startDate,
    endDate,
    timeLabel: record.time ? timeParts.timeLabel : "כל היום",
    meridiem: record.time ? timeParts.meridiem : undefined,
    description: record.description,
    location: record.location,
    assigneeIds: record.assigneeIds,
    ownerId: record.ownerId,
    audience: record.audience,
    accentId,
  };
};

const getDatesBetween = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const sortDisplayItems = (
  left: CalendarDisplayItem,
  right: CalendarDisplayItem,
) => {
  const timeDiff = left.date.getTime() - right.date.getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }

  if (left.kind !== right.kind) {
    return left.kind === "deadline" ? 1 : -1;
  }

  return left.title.localeCompare(right.title);
};

const buildDefaultAssigneeIds = (
  currentUserId: string | undefined,
  memberIds: string[],
) => {
  if (currentUserId) {
    return [currentUserId];
  }

  return memberIds.length > 0 ? [memberIds[0]] : [];
};

const formatParticipantLabel = (
  member: MemberDirectoryUser,
  currentUserId?: string,
) => {
  if (member.uid === currentUserId) {
    return "You";
  }

  return member.displayName || member.email || "Unknown";
};

const formatSelectedAssigneesLabel = (
  assigneeIds: string[],
  audience: CalendarEventAudience,
  membersById: Map<string, MemberDirectoryUser>,
  currentUserId?: string,
) => {
  if (audience === "everyone") {
    return "כולם";
  }

  const labels = assigneeIds
    .map((id) => membersById.get(id))
    .filter((member): member is MemberDirectoryUser => Boolean(member))
    .map((member) => formatParticipantLabel(member, currentUserId));

  if (labels.length === 0) {
    return "בחר אנשים";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels[0]} +${labels.length - 1}`;
};

export const CalendarPage = () => {
  const { user } = useAuth();
  const { projectId } = useParams();
  const { project, loading, error } = useWorkspaceProject(projectId);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>(
    [],
  );
  const [projectMembers, setProjectMembers] = useState<MemberDirectoryUser[]>(
    [],
  );
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [calendarLoadError, setCalendarLoadError] = useState<string | null>(
    null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isParticipantMenuOpen, setIsParticipantMenuOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState<EventFormState>({
    title: "",
    startDate: toDateInputValue(new Date()),
    endDate: toDateInputValue(new Date()),
    time: "",
    description: "",
    location: "",
    audience: "selected",
    assigneeIds: buildDefaultAssigneeIds(user?.uid, []),
  });
  const [selectedDate, setSelectedDate] = useState(() => getInitialFocusDate());
  const [monthCursor, setMonthCursor] = useState(() =>
    toMonthStart(getInitialFocusDate()),
  );

  useEffect(() => {
    let active = true;

    if (!project) {
      return () => {
        active = false;
      };
    }

    void Promise.all([
      getUsersByIds(project.memberIds),
      getProjectCalendarEvents(project.id),
    ])
      .then(([members, events]) => {
        if (!active) {
          return;
        }

        setProjectMembers(members);
        setCalendarEvents(events);
        setLoadedProjectId(project.id);
        setCalendarLoadError(null);

        const initialFocusDate = getInitialFocusDate();
        setSelectedDate(initialFocusDate);
        setMonthCursor(toMonthStart(initialFocusDate));
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        console.error("Failed to load calendar data", loadError);
        setLoadedProjectId(project.id);
        setCalendarLoadError("לא הצלחנו לטעון את נתוני היומן.");
      });

    return () => {
      active = false;
    };
  }, [project]);

  const projectIsLoaded = loadedProjectId === project?.id;
  const currentCalendarError =
    project && loadedProjectId === project.id ? calendarLoadError : null;

  const memberOptions = useMemo(() => {
    const options = [...projectMembers];

    if (user) {
      const currentUserOption: MemberDirectoryUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };

      if (!options.some((member) => member.uid === user.uid)) {
        options.unshift(currentUserOption);
      }
    }

    return options;
  }, [projectMembers, user]);

  const memberOptionsById = useMemo(
    () => new Map(memberOptions.map((member) => [member.uid, member])),
    [memberOptions],
  );

  const displayItems = useMemo(() => {
    if (!project) {
      return [];
    }

    const baseItems = [
      ...calendarEvents.map(mapRecordToDisplayItem),
      ...getDeadlineItems(project),
    ];

    const expandedItems: CalendarDisplayItem[] = [];
    for (const item of baseItems) {
      const datesInRange = getDatesBetween(item.startDate, item.endDate);
      for (const dateInRange of datesInRange) {
        expandedItems.push({
          ...item,
          date: dateInRange,
        });
      }
    }

    return expandedItems.sort(sortDisplayItems);
  }, [calendarEvents, project]);

  const itemsByDate = useMemo(() => {
    return displayItems.reduce<Record<string, CalendarDisplayItem[]>>(
      (accumulator, item) => {
        const key = getDateKey(item.date);
        if (!accumulator[key]) {
          accumulator[key] = [];
        }

        accumulator[key].push(item);
        return accumulator;
      },
      {},
    );
  }, [displayItems]);

  const selectedDateKey = getDateKey(selectedDate);
  const selectedItems = itemsByDate[selectedDateKey] ?? [];
  const monthCells = getCalendarCells(monthCursor);

  const openCreateDialog = (seedDate?: Date) => {
    const nextDate = seedDate ?? selectedDate ?? new Date();
    const defaultAssigneeIds = buildDefaultAssigneeIds(
      user?.uid,
      memberOptions.map((member) => member.uid),
    );

    setDialogError(null);
    setEventDraft({
      title: "",
      startDate: toDateInputValue(nextDate),
      endDate: toDateInputValue(nextDate),
      time: "",
      description: "",
      location: "",
      audience: "selected",
      assigneeIds: defaultAssigneeIds,
    });
    setIsParticipantMenuOpen(false);
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setIsParticipantMenuOpen(false);
    setDialogError(null);
  };

  const toggleAssignee = (memberId: string) => {
    setEventDraft((current) => {
      if (current.audience === "everyone") {
        return {
          ...current,
          audience: "selected",
          assigneeIds: [memberId],
        };
      }

      const nextAssignees = current.assigneeIds.includes(memberId)
        ? current.assigneeIds.filter((id) => id !== memberId)
        : [...current.assigneeIds, memberId];

      return {
        ...current,
        assigneeIds:
          nextAssignees.length > 0
            ? nextAssignees
            : buildDefaultAssigneeIds(
                user?.uid,
                memberOptions.map((member) => member.uid),
              ),
      };
    });
  };

  const selectEveryone = () => {
    setEventDraft((current) => ({
      ...current,
      audience: "everyone",
      assigneeIds: [],
    }));
  };

  const selectSelectedPeople = () => {
    setEventDraft((current) => ({
      ...current,
      audience: "selected",
      assigneeIds:
        current.assigneeIds.length > 0
          ? current.assigneeIds
          : buildDefaultAssigneeIds(
              user?.uid,
              memberOptions.map((member) => member.uid),
            ),
    }));
  };

  const handleSubmitEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!project || !user) {
      return;
    }

    if (!eventDraft.title.trim()) {
      setDialogError("אנא הוסף כותרת.");
      return;
    }

    if (!eventDraft.startDate || !eventDraft.endDate) {
      setDialogError("אנא בחר תאריכי התחלה וסיום.");
      return;
    }

    const scheduledStartDate = parseDateInputValue(
      eventDraft.startDate,
      eventDraft.time,
    );
    const scheduledEndDate = parseDateInputValue(
      eventDraft.endDate,
      eventDraft.time,
    );

    if (scheduledEndDate < scheduledStartDate) {
      setDialogError("תאריך הסיום חייב להיות אחרי או שווה לתאריך ההתחלה.");
      return;
    }

    const normalizedAudience = eventDraft.audience;
    const selectedAssigneeIds =
      normalizedAudience === "everyone"
        ? []
        : eventDraft.assigneeIds.length > 0
          ? eventDraft.assigneeIds
          : buildDefaultAssigneeIds(
              user.uid,
              memberOptions.map((member) => member.uid),
            );

    const ownerId =
      normalizedAudience === "everyone"
        ? user.uid
        : (selectedAssigneeIds[0] ?? user.uid);

    setIsSavingEvent(true);
    setDialogError(null);

    try {
      const eventId = await createProjectCalendarEvent(project.id, {
        title: eventDraft.title,
        startDate: scheduledStartDate,
        endDate: scheduledEndDate,
        time: eventDraft.time || undefined,
        description: eventDraft.description || undefined,
        location: eventDraft.location || undefined,
        ownerId,
        assigneeIds: selectedAssigneeIds,
        audience: normalizedAudience,
        createdBy: user.uid,
      });

      const savedRecord: CalendarEventRecord = {
        id: eventId,
        projectId: project.id,
        title: eventDraft.title.trim(),
        startDate: Timestamp.fromDate(scheduledStartDate),
        endDate: Timestamp.fromDate(scheduledEndDate),
        time: eventDraft.time || null,
        description: eventDraft.description.trim() || null,
        location: eventDraft.location.trim() || null,
        ownerId,
        assigneeIds: selectedAssigneeIds,
        audience: normalizedAudience,
        createdBy: user.uid,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      setCalendarEvents((current) =>
        [...current, savedRecord].sort((left, right) =>
          left.startDate.toMillis() === right.startDate.toMillis()
            ? left.title.localeCompare(right.title)
            : left.startDate.toMillis() - right.startDate.toMillis(),
        ),
      );
      setLoadedProjectId(project.id);
      setSelectedDate(scheduledStartDate);
      setMonthCursor(toMonthStart(scheduledStartDate));
      closeCreateDialog();
    } catch (saveError) {
      console.error("Failed to create calendar event", saveError);
      setDialogError("לא הצלחנו לשמור את האירוע. אנא נסה שוב.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!project) {
      return;
    }

    try {
      await deleteProjectCalendarEvent(project.id, eventId);
      setCalendarEvents((current) =>
        current.filter((event) => event.id !== eventId),
      );
    } catch (deleteError) {
      console.error("Failed to delete calendar event", deleteError);
      alert("לא הצלחנו למחוק את האירוע. אנא נסה שוב.");
    }
  };

  if (loading) {
    return (
      <PageSection className="calendar-page">
        <GlassPanel className="calendar-page__loading" intensity="strong">
          טוען נתונתים...
        </GlassPanel>
      </PageSection>
    );
  }

  if (error) {
    return <PageSection className="calendar-page">{error}</PageSection>;
  }

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  if (!projectIsLoaded && !currentCalendarError) {
    return (
      <PageSection className="calendar-page">
        <GlassPanel className="calendar-page__loading" intensity="strong">
          טוען נתוני יומן...
        </GlassPanel>
      </PageSection>
    );
  }

  if (currentCalendarError) {
    return (
      <PageSection className="calendar-page">
        {currentCalendarError}
      </PageSection>
    );
  }

  return (
    <PageSection className="calendar-page" aria-labelledby="calendar-title">
      <div className="calendar-page__layout">
        <section className="calendar-page__main" aria-label="Calendar view">
          <div className="calendar-page__hero">
            <div>
              <p className="calendar-page__eyebrow">יומן</p>
              <h1 id="calendar-title" className="calendar-page__month-title">
                {getMonthTitle(monthCursor)}
              </h1>
            </div>

            <div className="calendar-page__hero-actions">
              <div
                className="calendar-page__month-controls"
                role="group"
                aria-label="ניווט חודש יומן"
              >
                <button
                  type="button"
                  className="calendar-page__control-button"
                  onClick={() =>
                    setMonthCursor(
                      (current) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() - 1,
                          1,
                        ),
                    )
                  }
                  aria-label="Previous month"
                >
                  <ChevronRight size={18} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  className="calendar-page__today-chip"
                  onClick={() => {
                    const today = new Date();
                    setSelectedDate(today);
                    setMonthCursor(toMonthStart(today));
                  }}
                >
                  היום
                </button>
                <button
                  type="button"
                  className="calendar-page__control-button"
                  onClick={() =>
                    setMonthCursor(
                      (current) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() + 1,
                          1,
                        ),
                    )
                  }
                  aria-label="Next month"
                >
                  <ChevronLeft size={18} strokeWidth={2.25} />
                </button>
              </div>

              <Button
                type="button"
                size="md"
                variant="primary"
                className="calendar-page__add-event-button"
                onClick={() => openCreateDialog(selectedDate)}
              >
                <Plus size={16} />
                הוסף אירוע
              </Button>
            </div>
          </div>

          <GlassPanel
            className="calendar-page__calendar-surface"
            intensity="soft"
          >
            <div className="calendar-page__weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="calendar-page__weekday">
                  {label}
                </span>
              ))}
            </div>

            <div
              className="calendar-page__grid"
              role="grid"
              aria-label="Monthly calendar"
            >
              {monthCells.map((date) => {
                const dateKey = getDateKey(date);
                const inMonth = date.getMonth() === monthCursor.getMonth();
                const isSelected = sameDate(date, selectedDate);
                const items = itemsByDate[dateKey] ?? [];

                return (
                  <button
                    key={dateKey}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    className={[
                      "calendar-page__day-cell",
                      inMonth ? "" : "is-outside",
                      isSelected ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className="calendar-page__day-label">
                      {date.getDate()}
                    </span>
                    <div className="calendar-page__chips">
                      {items.slice(0, 2).map((item) => (
                        <span
                          key={item.id}
                          className={[
                            "calendar-page__event-chip",
                            item.kind === "deadline"
                              ? "is-deadline"
                              : "is-event",
                            getParticipantAccentClass(item.accentId, item.tone),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={item.title}
                        >
                          {item.title}
                        </span>
                      ))}
                      {items.length > 2 ? (
                        <span className="calendar-page__event-chip calendar-page__event-chip--more">
                          +{items.length - 2} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassPanel>
        </section>

        <aside
          className="calendar-page__side"
          aria-label="Selected day details"
        >
          <GlassPanel className="calendar-page__details" intensity="strong">
            <div className="calendar-page__details-header">
              <div>
                <h2 className="calendar-page__details-title">
                  {selectedDate.toLocaleDateString("he-IL", {
                    month: "long",
                    day: "numeric",
                  })}
                </h2>
                <p className="calendar-page__details-weekday">
                  {getWeekdayTitle(selectedDate)}
                </p>
              </div>

              <button
                type="button"
                className="calendar-page__panel-add-button"
                onClick={() => openCreateDialog(selectedDate)}
                aria-label="Add event for this day"
              >
                <Plus size={14} strokeWidth={2.6} />
              </button>
            </div>

            <div className="calendar-page__agenda" aria-label="אירועי יום">
              {selectedItems.length ? (
                selectedItems.map((item) => {
                  const attendees =
                    item.audience === "everyone"
                      ? memberOptions.slice(0, 4).map((member) => ({
                          id: member.uid,
                          displayName: member.displayName,
                          email: member.email,
                          photoURL: member.photoURL,
                        }))
                      : item.assigneeIds?.length
                        ? item.assigneeIds
                            .map((assigneeId) =>
                              memberOptionsById.get(assigneeId),
                            )
                            .filter((member): member is MemberDirectoryUser =>
                              Boolean(member),
                            )
                            .map((member) => ({
                              id: member.uid,
                              displayName: member.displayName,
                              email: member.email,
                              photoURL: member.photoURL,
                            }))
                        : [];
                  const attendeeLabels =
                    item.audience === "everyone"
                      ? "Everyone"
                      : attendees.length > 0
                        ? attendees.length > 2
                          ? `+${attendees.length - 2} more`
                          : "Team"
                        : null;

                  return (
                    <article
                      key={item.id}
                      className={[
                        "calendar-page__agenda-item",
                        item.kind === "deadline" ? "is-deadline" : "is-event",
                        getParticipantAccentClass(item.accentId, item.tone),
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.kind === "event" ? (
                        <button
                          type="button"
                          className="calendar-page__agenda-delete"
                          onClick={() => handleDeleteEvent(item.id)}
                          aria-label="מחק אירוע"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      ) : null}

                      <div className="calendar-page__agenda-time">
                        <strong>{item.timeLabel}</strong>
                        {item.meridiem ? <span>{item.meridiem}</span> : null}
                      </div>

                      <div className="calendar-page__agenda-content">
                        {item.kind === "deadline" ? (
                          <div className="calendar-page__deadline-row">
                            <TriangleAlert size={14} strokeWidth={2.3} />
                            <span>דדליין</span>
                          </div>
                        ) : null}

                        <h3>{item.title}</h3>

                        {item.location ? (
                          <p>
                            <MapPin size={14} strokeWidth={2.2} />
                            <span>{item.location}</span>
                          </p>
                        ) : null}

                        {item.description ? (
                          <p className="calendar-page__event-note">
                            {item.description}
                          </p>
                        ) : null}

                        {attendees.length ? (
                          <div className="calendar-page__attendees">
                            <MemberAvatarGroup
                              members={attendees}
                              size="sm"
                              maxVisible={3}
                            />
                            <span>{attendeeLabels}</span>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="calendar-page__empty">
                  אין אירועים ביום זה עדיין.
                </p>
              )}
            </div>
          </GlassPanel>
        </aside>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="calendar-page__dialog-backdrop"
          role="presentation"
          onClick={closeCreateDialog}
        >
          <GlassPanel
            className="calendar-page__dialog"
            intensity="strong"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
            onClick={(dialogClickEvent) => dialogClickEvent.stopPropagation()}
          >
            <div className="calendar-page__dialog-header">
              <div>
                <p className="calendar-page__dialog-eyebrow">אירוע חדש</p>
                <h2
                  id="create-event-title"
                  className="calendar-page__dialog-title"
                >
                  הוסף אירוע
                </h2>
              </div>
              <button
                type="button"
                className="calendar-page__dialog-close"
                onClick={closeCreateDialog}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form className="calendar-page__form" onSubmit={handleSubmitEvent}>
              <label className="calendar-page__field calendar-page__field--full">
                <span>כותרת</span>
                <input
                  type="text"
                  value={eventDraft.title}
                  onChange={(changeEvent) =>
                    setEventDraft((current) => ({
                      ...current,
                      title: changeEvent.target.value,
                    }))
                  }
                  placeholder="סקירת ספרות"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="calendar-page__field">
                <span>תאריך התחלה</span>
                <input
                  type="date"
                  value={eventDraft.startDate}
                  onChange={(changeEvent) =>
                    setEventDraft((current) => ({
                      ...current,
                      startDate: changeEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="calendar-page__field">
                <span>תאריך סיום</span>
                <input
                  type="date"
                  value={eventDraft.endDate}
                  onChange={(changeEvent) =>
                    setEventDraft((current) => ({
                      ...current,
                      endDate: changeEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="calendar-page__field">
                <span>שעה (אופציונלי)</span>
                <input
                  type="time"
                  value={eventDraft.time}
                  onChange={(changeEvent) =>
                    setEventDraft((current) => ({
                      ...current,
                      time: changeEvent.target.value,
                    }))
                  }
                />
              </label>

              <label className="calendar-page__field calendar-page__field--full">
                <span>תיאור</span>
                <textarea
                  value={eventDraft.description}
                  onChange={(changeEvent) =>
                    setEventDraft((current) => ({
                      ...current,
                      description: changeEvent.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="הוסף הערות הקשר או סדר יום"
                />
              </label>

              <label className="calendar-page__field calendar-page__field--full">
                <span>מיקום</span>
                <input
                  type="text"
                  value={eventDraft.location}
                  onChange={(changeEvent) =>
                    setEventDraft((current) => ({
                      ...current,
                      location: changeEvent.target.value,
                    }))
                  }
                  placeholder="חדר ספרייה וירטואלי B"
                />
              </label>

              <div className="calendar-page__field calendar-page__field--full">
                <span>משתתפים</span>
                <div className="calendar-page__picker-wrap">
                  <button
                    type="button"
                    className="calendar-page__picker-button"
                    onClick={() =>
                      setIsParticipantMenuOpen((current) => !current)
                    }
                    aria-expanded={isParticipantMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <Users size={15} strokeWidth={2.2} />
                    <span>
                      {formatSelectedAssigneesLabel(
                        eventDraft.assigneeIds,
                        eventDraft.audience,
                        memberOptionsById,
                        user?.uid,
                      )}
                    </span>
                    <ChevronRight
                      size={14}
                      strokeWidth={2.3}
                      className={[
                        "calendar-page__picker-chevron",
                        isParticipantMenuOpen ? "is-open" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  </button>

                  {isParticipantMenuOpen ? (
                    <div className="calendar-page__picker-menu" role="listbox">
                      <button
                        type="button"
                        className={[
                          "calendar-page__picker-option",
                          eventDraft.audience === "everyone"
                            ? "is-selected"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={selectEveryone}
                      >
                        <span className="calendar-page__picker-check">✓</span>
                        <span className="calendar-page__picker-name">
                          Everyone
                        </span>
                      </button>

                      <div className="calendar-page__picker-divider" />

                      {memberOptions.map((member) => {
                        const isSelected =
                          eventDraft.audience === "selected" &&
                          eventDraft.assigneeIds.includes(member.uid);

                        return (
                          <button
                            key={member.uid}
                            type="button"
                            className={[
                              "calendar-page__picker-option",
                              isSelected ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => {
                              selectSelectedPeople();
                              toggleAssignee(member.uid);
                            }}
                          >
                            <span className="calendar-page__picker-check">
                              {isSelected ? "✓" : ""}
                            </span>
                            <span className="calendar-page__picker-name">
                              {formatParticipantLabel(member, user?.uid)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {dialogError ? (
                <p className="calendar-page__dialog-error">{dialogError}</p>
              ) : null}

              <div className="calendar-page__dialog-actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={closeCreateDialog}
                >
                  ביטול
                </Button>
                <Button type="submit" size="md" disabled={isSavingEvent}>
                  {isSavingEvent ? "שומר..." : "צור אירוע"}
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
      ) : null}
    </PageSection>
  );
};
