import { useState } from "react";
import { LeaderboardDialog } from "@components/dashboard/LeaderboardDialog";
import type {
  MemberDirectoryUser,
  ProjectTaskRecord,
} from "@services/firebase/firebase";
import { GlassPanel } from "@components/ui/GlassPanel";
import "./Podium.scss";

interface TopUser {
  id?: string;
  name?: string;
  photoURL?: string;
  score?: number;
}

interface PodiumProps {
  topUsers?: TopUser[];
  tasks?: ProjectTaskRecord[];
  members?: MemberDirectoryUser[];
  trophyName?: string | null;
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const Avatar = ({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const [failed, setFailed] = useState(false);
  const dims = { sm: 36, md: 44, lg: 56 };
  const textSize = { sm: "0.7rem", md: "0.8rem", lg: "1rem" };
  const d = dims[size];

  if (!src || failed) {
    return (
      <div
        style={{
          width: d,
          height: d,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: textSize[size],
          background: "var(--color-primary-container)",
          color: "var(--color-primary)",
          border: "2.5px solid var(--color-surface-raised)",
          boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
        }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      style={{
        width: d,
        height: d,
        borderRadius: "50%",
        objectFit: "cover",
        border: "2.5px solid var(--color-surface-raised)",
        boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
      }}
      src={src}
      alt={name ?? ""}
      onError={() => setFailed(true)}
    />
  );
};

export const Podium = ({
  topUsers = [],
  tasks,
  members,
  trophyName,
}: PodiumProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const podiumUsers = topUsers?.slice(0, 3) ?? [];

  const podiumSlots = [
    {
      position: "second" as const,
      medal: "🥈",
      heightPct: 70,
      user: podiumUsers[1],
      rank: 2,
    },
    {
      position: "first" as const,
      medal: "🥇",
      heightPct: 90,
      user: podiumUsers[0],
      rank: 1,
    },
    {
      position: "third" as const,
      medal: "🥉",
      heightPct: 50,
      user: podiumUsers[2],
      rank: 3,
    },
  ];

  const barColors: Record<number, string> = {
    1: "linear-gradient(180deg, #ffd700 0%, #b8860b 100%)",
    2: "linear-gradient(180deg, #e8e8e8 0%, #a0a0a0 100%)",
    3: "linear-gradient(180deg, #e8a060 0%, #a0522d 100%)",
  };

  return (
    <>
      <div
        style={{ width: "100%", height: "100%", cursor: "pointer" }}
        onClick={() => setIsDialogOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsDialogOpen(true);
        }}
      >
        <GlassPanel
          className="distribution-card"
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "1.25rem",
            paddingTop: "3.5rem",
          }}
        >
          {trophyName && (
            <div className="podium-trophy">
              <span className="podium-trophy__icon">🏆</span>
              <span className="podium-trophy__text">{trophyName}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: "0",
              height: "100%",
              width: "100%",
              maxWidth: "28rem",
              margin: "0 auto",
            }}
          >
            {podiumSlots.map(({ position, medal, heightPct, user, rank }) => {
              const firstName = user?.name?.split(" ")[0] ?? "";

              return (
                <div
                  key={position}
                  className="podium-slot"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    flex: "1 1 0",
                    minWidth: 0,
                    height: `${heightPct}%`,
                    position: "relative",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <Avatar
                      src={user?.photoURL}
                      name={user?.name}
                      size={rank === 1 ? "lg" : "md"}
                    />
                  </div>

                  <div
                    className="podium-slot__bar"
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: "1rem 1rem 0 0",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                      padding: "0.5rem 0.25rem",
                      background: barColors[rank],
                      border:
                        "1px solid color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-glass-border))",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: rank === 1 ? "1.75rem" : "1.4rem",
                        lineHeight: 1,
                      }}
                    >
                      {medal}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: rank === 2 ? "var(--color-text)" : "#fff",
                        textAlign: "center",
                        lineHeight: 1.2,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {firstName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>

      <LeaderboardDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        tasks={tasks}
        members={members}
      />
    </>
  );
};
