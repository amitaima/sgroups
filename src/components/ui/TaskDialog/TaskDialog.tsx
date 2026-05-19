import { X } from "lucide-react";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { Button } from "@components/ui/Button/Button";
import { MemberAvatarGroup } from "@components/users/MemberAvatarGroup";
import type { TaskDialogProps } from "./TaskDialog.types";
import "./TaskDialog.scss";

export const TaskDialog = ({
  isOpen,
  mode,
  draft,
  setDraft,
  statusOptions,
  statusLabels,
  priorityLabels,
  assigneeOptions,
  currentTaskMembers,
  onToggleAssignee,
  onClose,
  onSubmit,
  onGenerateSuggestion,
  isAiGenerating,
  isAiSuggestionUsed,
  aiTitleError,
  onClearAiTitleError,
  error,
  isSaving,
}: TaskDialogProps) => {
  if (!isOpen) {
    return null;
  }

  const canUseAiSuggestion = mode === "create" && Boolean(onGenerateSuggestion);
  const isAiSuggestionDisabled = Boolean(isAiGenerating || isAiSuggestionUsed);

  return (
    <div className="task-dialog__backdrop" role="presentation">
      <GlassPanel
        className="task-dialog"
        intensity="strong"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-dialog__header">
          <div className="task-dialog__heading">
            <p className="task-dialog__eyebrow">
              {mode === "edit" ? "עריכת משימה" : "משימה חדשה"}
            </p>
            <h2 id="task-dialog-title" className="task-dialog__title">
              {draft.title.trim() || "פרטי משימה"}
            </h2>
            <p className="task-dialog__subtitle">
              עדכון כותרת, תיאור, אחראים, סטטוס ועדיפות.
            </p>
          </div>

          <button
            type="button"
            className="task-dialog__close"
            onClick={onClose}
            aria-label="סגירת חלון"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form className="task-dialog__form" onSubmit={onSubmit}>
          <div className="task-dialog__grid">
            <label className="task-dialog__field task-dialog__field--full">
              <div className="task-dialog__field-heading">
                <span>כותרת</span>
                {canUseAiSuggestion ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="task-dialog__ai-button"
                    disabled={isAiSuggestionDisabled}
                    onClick={onGenerateSuggestion}
                  >
                    {isAiGenerating
                      ? "מחולל..."
                      : isAiSuggestionUsed
                        ? "הצעת AI נוצרה"
                        : "הצע ב-AI"}
                  </Button>
                ) : null}
              </div>
              <input
                type="text"
                value={draft.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  if (nextTitle.trim()) {
                    onClearAiTitleError?.();
                  }

                  setDraft((current) => ({
                    ...current,
                    title: nextTitle,
                  }));
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !canUseAiSuggestion) {
                    return;
                  }

                  event.preventDefault();
                  if (isAiSuggestionDisabled) {
                    return;
                  }

                  void onGenerateSuggestion?.();
                }}
                className={aiTitleError ? "is-invalid" : undefined}
                aria-invalid={Boolean(aiTitleError)}
                aria-describedby={
                  aiTitleError ? "task-dialog-title-error" : undefined
                }
                placeholder="מקורות לסקירת הספרות"
                autoComplete="off"
                required
              />
              {aiTitleError ? (
                <p
                  className="task-dialog__field-error"
                  id="task-dialog-title-error"
                >
                  {aiTitleError}
                </p>
              ) : null}
            </label>

            <label className="task-dialog__field task-dialog__field--full">
              <span>תיאור</span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="הוספת הקשר, הערות או פרטים תומכים."
              />
            </label>

            <label className="task-dialog__field">
              <span>סטטוס</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target
                      .value as TaskDialogProps["draft"]["status"],
                  }))
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="task-dialog__field">
              <span>עדיפות</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priority: event.target
                      .value as TaskDialogProps["draft"]["priority"],
                  }))
                }
              >
                {Object.entries(priorityLabels).map(([priority, label]) => (
                  <option key={priority} value={priority}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="task-dialog__field">
              <span>רמת קושי</span>
              <select
                value={draft.difficulty}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    difficulty: event.target.value as TaskDialogProps["draft"]["difficulty"],
                  }))
                }
              >
                <option value="easy">קל</option>
                <option value="medium">בינוני</option>
                <option value="hard">קשה</option>
              </select>
            </label>

            <label className="task-dialog__field">
              <span>תאריך יעד</span>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </label>

            <div className="task-dialog__field task-dialog__field--full">
              <span>אחראים</span>
              {assigneeOptions.length ? (
                <div className="task-dialog__assignee-picker">
                  {assigneeOptions.map((member) => {
                    const isSelected = draft.assigneeIds.includes(member.id);

                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`task-dialog__assignee-pill${
                          isSelected ? " is-selected" : ""
                        }`}
                        onClick={() => onToggleAssignee(member.id)}
                      >
                        <MemberAvatarGroup
                          members={[member]}
                          size="sm"
                          maxVisible={1}
                        />
                        <span>
                          {member.displayName || member.email || member.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="task-dialog__empty">לא נמצאו חברי צוות לשיוך.</p>
              )}
            </div>

            {mode === "edit" ? (
              <div className="task-dialog__field task-dialog__field--full">
                <span>אחראים נוכחיים</span>
                {currentTaskMembers?.length ? (
                  <div className="task-dialog__assignees">
                    <MemberAvatarGroup
                      members={currentTaskMembers}
                      size="sm"
                      maxVisible={4}
                    />
                    <p>
                      {currentTaskMembers
                        .map(
                          (member) =>
                            member.displayName || member.email || member.id,
                        )
                        .join(", ")}
                    </p>
                  </div>
                ) : (
                  <p className="task-dialog__empty">אין עדיין אחראים.</p>
                )}
              </div>
            ) : null}
          </div>

          {error ? <p className="task-dialog__error">{error}</p> : null}

          <div className="task-dialog__actions">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              ביטול
            </Button>
            <Button type="submit" size="md" disabled={isSaving}>
              {isSaving
                ? "שומר..."
                : mode === "edit"
                  ? "שמירת שינויים"
                  : "יצירת משימה"}
            </Button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
};
