import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleUserRound, LogOut, Settings2 } from "lucide-react";
import type { ProfileMenuButtonProps } from "./ProfileMenuButton.types";
import "./ProfileMenuButton.scss";

export const ProfileMenuButton = ({
  userLabel,
  userPhoto,
  onSignOut,
  className,
}: ProfileMenuButtonProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await onSignOut();
  };

  return (
    <div
      className={
        className ? `profile-menu-button ${className}` : "profile-menu-button"
      }
      ref={menuRef}
      data-open={menuOpen ? "true" : "false"}
    >
      <button
        className="profile-menu-button__trigger"
        type="button"
        onClick={() => setMenuOpen((next) => !next)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="profile-menu-button__avatar">
          {userPhoto ? (
            <img
              className="profile-menu-button__image"
              src={userPhoto}
              alt={userLabel}
            />
          ) : (
            <CircleUserRound size={18} strokeWidth={2.25} />
          )}
        </span>
        <span className="profile-menu-button__label">{userLabel}</span>
        <ChevronDown size={16} className="profile-menu-button__chevron" />
      </button>

      {menuOpen ? (
        <div className="profile-menu-button__menu" role="menu">
          <button
            className="profile-menu-button__menu-item"
            type="button"
            disabled
          >
            <Settings2 size={16} />
            העדפות
          </button>
          <button
            className="profile-menu-button__menu-item"
            type="button"
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            התנתקות
          </button>
        </div>
      ) : null}
    </div>
  );
};
