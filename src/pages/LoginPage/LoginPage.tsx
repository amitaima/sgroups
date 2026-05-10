import { useEffect, useMemo, useState } from "react";
import type { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, upsertUserProfile } from "@services/firebase/firebase";
import { useAuth } from "@app/providers/AuthProvider";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { Button } from "@components/ui/Button/Button";
import { useNavigate } from "react-router-dom";
import "./LoginPage.scss";
import loginImage from "@assets/images/login-image.webp";
import { FcGoogle } from "react-icons/fc";
import { Logo } from "@components/ui/Logo/Logo";

export const LoginPage = () => {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const provider = useMemo(() => new GoogleAuthProvider(), []);

  useEffect(() => {
    if (!initializing && user) {
      navigate("/projects", { replace: true });
    }
  }, [initializing, navigate, user]);

  const getAuthErrorMessage = (code: string, flow: "login" | "signup") => {
    switch (code) {
      case "auth/invalid-email":
        return "כתובת האימייל לא תקינה";
      case "auth/user-disabled":
        return "החשבון הושבת";
      case "auth/user-not-found":
        return "משתמש לא נמצא";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "פרטי ההתחברות שגויים";
      case "auth/email-already-in-use":
        return "האימייל כבר בשימוש";
      case "auth/weak-password":
        return "הסיסמה חלשה מדי";
      case "auth/popup-closed-by-user":
        return "החלון נסגר לפני השלמת ההתחברות";
      case "auth/popup-blocked":
        return "הדפדפן חסם את חלון ההתחברות";
      case "auth/operation-not-allowed":
        return "שיטת ההתחברות אינה זמינה";
      default:
        return flow === "signup" ? "שגיאה בהרשמה" : "שגיאה בהתחברות";
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess("התחברת בהצלחה");
      } else {
        const normalizedUsername = username.trim();
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(credential.user, {
          displayName: normalizedUsername,
        });
        await upsertUserProfile(credential.user);
        setSuccess("ההרשמה הושלמה בהצלחה");
      }
    } catch (err) {
      const code = (err as FirebaseError | undefined)?.code;
      setError(getAuthErrorMessage(code ?? "", mode));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      setSuccess("התחברת בהצלחה");
    } catch (err) {
      const code = (err as FirebaseError | undefined)?.code;
      setError(getAuthErrorMessage(code ?? "", "login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageSection className="login-page" aria-label="דף התחברות" dir="rtl">
      <div className="login-page__split">
        <aside className="login-page__hero" aria-hidden={false}>
          <div className="login-page__hero-media" role="img" aria-label="מדיה">
            <img src={loginImage} alt="תמונת סטודנטים" />
            <div className="login-page__hero-overlay" />
          </div>
          <div className="login-page__brand">
            <div className="login-page__brand-text">
              <div className="login-page__brand-title">Groups</div>
            </div>
            <div className="login-page__logo" aria-hidden>
              <Logo size={68} color="var(--color-primary)" />
            </div>
          </div>
          <div className="login-page__hero-copy">
            <h2>הגביהו את המסע האקדמי שלכם</h2>
            <p>
              בואו לשפר את שיתוף הפעולה והניהול של קבוצות הלימוד והמחקר שלכם עם
              SGroups - הפלטפורמה האולטימטיבית לניהול קבוצות אקדמיות.
            </p>
          </div>
        </aside>

        <main className="login-page__panel">
          <div className="login-page__logo_mobile" aria-hidden>
            <Logo size={76} color="var(--color-primary)" />
          </div>
          <div className="login-page__panel-inner">
            <header className="login-page__panel-header">
              <h1>{mode === "login" ? "התחברות" : "הרשמה"}</h1>
              <p className="muted">
                {mode === "login" ? "התחבר כדי להמשיך" : "צור חשבון חדש"}
              </p>
            </header>

            <form className="login-page__form" onSubmit={handleEmailSubmit}>
              <div className="flex flex-col gap-4">
                {mode !== "login" ? (
                  <label className="login-page__field">
                    <span className="login-page__label">שם משתמש</span>
                    <input
                      className="login-page__input"
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        setSuccess(null);
                      }}
                      required
                    />
                  </label>
                ) : null}

                <label className="login-page__field">
                  <span className="login-page__label">אימייל</span>
                  <input
                    className="login-page__input"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setSuccess(null);
                    }}
                    placeholder="scholar@institution.edu"
                    required
                  />
                </label>

                <label className="login-page__field">
                  <div className="login-page__field-row">
                    <span className="login-page__label">סיסמה</span>
                    {mode === "login" ? (
                      <button
                        className="login-page__forgot"
                        type="button"
                        onClick={() => {}}
                      >
                        שכחת סיסמה?
                      </button>
                    ) : null}
                  </div>
                  <input
                    className="login-page__input"
                    type="password"
                    name="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setSuccess(null);
                    }}
                    placeholder="••••••••"
                    required
                  />
                </label>
              </div>

              {success ? (
                <p className="login-page__success">{success}</p>
              ) : null}
              {error ? <p className="login-page__error">{error}</p> : null}

              <div className="login-page__actions">
                <Button type="submit" disabled={loading}>
                  {loading ? "טוען..." : mode === "login" ? "כניסה" : "הרשמה"}
                </Button>

                <div className="login-page__social">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <FcGoogle size={24} />
                    המשך עם Google
                  </Button>
                </div>
              </div>
            </form>

            <div className="login-page__panel-footer">
              <span>
                {mode === "login" ? "אין לך חשבון?" : "כבר יש לך חשבון?"}
              </span>
              <button
                type="button"
                className="login-page__link"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                  setSuccess(null);
                }}
              >
                {mode === "login" ? "ליצירת חשבון" : "להתחברות"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </PageSection>
  );
};
