import { useState } from "react";
import { LeaderboardDialog } from "@components/dashboard/LeaderboardDialog";
import type {
  MemberDirectoryUser,
  ProjectTaskRecord,
} from "@services/firebase/firebase";
import { GlassPanel } from "@components/ui/GlassPanel";

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
      position: "second",
      label: "🥈",
      heightClass: "h-[18vh]",
      colorClass: "bg-slate-200",
      user: podiumUsers[1],
    },
    {
      position: "first",
      label: "🥇",
      heightClass: "h-[24vh]",
      colorClass: "bg-amber-300",
      user: podiumUsers[0],
    },
    {
      position: "third",
      label: "🥉",
      heightClass: "h-[16vh]",
      colorClass: "bg-amber-100",
      user: podiumUsers[2],
    },
  ];

  const handleOpen = () => setIsDialogOpen(true);
  const handleClose = () => setIsDialogOpen(false);

  return (
    <>
      <div
        className="w-full max-h-[40vh] h-full overflow-hidden flex items-center justify-center rounded-xl p-4 pb-6 cursor-pointer hover:bg-opacity-90 transition relative"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            handleOpen();
          }
        }}
      >
        <GlassPanel className="distribution-card w-full h-full relative flex flex-col justify-end pt-8">
          {trophyName && (
            <div
              className="absolute top-4 right-4 z-10 bg-gradient-to-l from-amber-50 to-yellow-100/90 backdrop-blur-md px-5 py-3 rounded-lg border border-amber-300/50 shadow-[0_2px_12px_rgba(217,164,6,0.15)] text-right max-w-[85%] flex items-center gap-3"
              style={{ padding: "0.5rem" }}
            >
              <span className="text-xl leading-none drop-shadow-sm">🏆</span>
              <span className="text-m font-bold text-amber-900/90 whitespace-nowrap overflow-hidden text-ellipsis">
                {trophyName}
              </span>
            </div>
          )}

          <div className="flex items-end justify-center gap-0 h-full">
            {podiumSlots.map(
              ({ position, label, heightClass, colorClass, user }) => {
                const displayName = user?.name
                  ? user.name.split(" ").slice(0, 2).join("\n")
                  : "";

                return (
                  <div
                    key={position}
                    className="flex flex-col items-center gap-y-4"
                  >
                    <img
                      className="w-10 h-10 rounded-full object-cover border border-black/10"
                      src={
                        user?.photoURL ??
                        `https://i.pravatar.cc/150?u=${user?.id ?? position}`
                      }
                      alt={user?.name ?? `${position} place`}
                    />

                    <div
                      className={`${heightClass} w-20 ${colorClass} rounded-t-2xl flex flex-col items-center justify-center gap-1 px-1 py-2`}
                    >
                      <span className="text-black font-semibold text-sm text-center whitespace-pre-line break-words leading-tight max-w-full">
                        {displayName}
                      </span>
                      <span className="text-base" style={{ fontSize: "2rem" }}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </GlassPanel>
      </div>

      <LeaderboardDialog
        isOpen={isDialogOpen}
        onClose={handleClose}
        tasks={tasks}
        members={members}
      />
    </>
  );
};
