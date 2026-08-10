import React from "react";
import "./AiTaskCreationLoader.scss";

type AiTaskCreationLoaderProps = {
  message?: string;
  className?: string;
};

export function AiTaskCreationLoader({
  message = "AI is creating your tasks",
  className = "",
}: AiTaskCreationLoaderProps) {
  return (
    <div
      className={`ai-task-loader ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="ai-task-loader__visual" aria-hidden="true">
        <div className="ai-task-loader__glow" />

        <div className="ai-task-loader__orb">
          <span className="ai-task-loader__spark ai-task-loader__spark--one">
            ✦
          </span>
          <span className="ai-task-loader__spark ai-task-loader__spark--two">
            ✦
          </span>
          <span className="ai-task-loader__spark ai-task-loader__spark--three">
            ·
          </span>

          <div className="ai-task-loader__brain">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="ai-task-loader__cards">
          <div className="ai-task-loader__card ai-task-loader__card--one">
            <span className="ai-task-loader__check">✓</span>
            <span className="ai-task-loader__line ai-task-loader__line--long" />
          </div>

          <div className="ai-task-loader__card ai-task-loader__card--two">
            <span className="ai-task-loader__check">✓</span>
            <span className="ai-task-loader__line ai-task-loader__line--medium" />
          </div>

          <div className="ai-task-loader__card ai-task-loader__card--three">
            <span className="ai-task-loader__check">✓</span>
            <span className="ai-task-loader__line ai-task-loader__line--short" />
          </div>
        </div>
      </div>

      <div className="ai-task-loader__content">
        <p className="ai-task-loader__title">
          {message}
          <span className="ai-task-loader__dots">
            <i />
            <i />
            <i />
          </span>
        </p>

        <p className="ai-task-loader__subtitle">
          מחלק את הפרוייקט למשימות קטנות ומסודרות עבורך, <br />
          פעולה זו עשויה להמשך מספר דקות.
        </p>
      </div>
    </div>
  );
}
