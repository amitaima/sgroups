import { useEffect, useMemo, useState } from "react";
import type { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@services/firebase/firebase";
import { useAuth } from "@app/providers/AuthProvider";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { Button } from "@components/ui/Button/Button";
import { useNavigate } from "react-router-dom";
import "./LoginPage.scss";

export const LoginPage = () => {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const provider = useMemo(() => new GoogleAuthProvider(), []);

  useEffect(() => {
    if (!initializing && user) {
      navigate("/", { replace: true });
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
        await createUserWithEmailAndPassword(auth, email, password);
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
    <PageSection className="login-page">
      <div className="login-page__card">
        <div className="login-page__header">
          <h1 className="login-page__title">
            {mode === "login" ? "התחברות" : "הרשמה"}
          </h1>
          <p className="login-page__subtitle">
            {mode === "login"
              ? "התחבר כדי להמשיך לאזור המוגן."
              : "צור חשבון חדש כדי להתחיל."}
          </p>
        </div>
        <form className="login-page__form" onSubmit={handleEmailSubmit}>
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
              required
            />
          </label>
          <label className="login-page__field">
            <span className="login-page__label">סיסמה</span>
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
              required
            />
          </label>
          {success ? <p className="login-page__success">{success}</p> : null}
          {error ? <p className="login-page__error">{error}</p> : null}
          <div className="login-page__actions">
            <Button type="submit" disabled={loading}>
              {loading ? "טוען..." : mode === "login" ? "כניסה" : "הרשמה"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              המשך עם Google
            </Button>
          </div>
        </form>
        <div className="login-page__switch">
          <span>{mode === "login" ? "אין לך חשבון?" : "כבר יש לך חשבון?"}</span>
          <button
            type="button"
            className="login-page__link"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setSuccess(null);
            }}
          >
            {mode === "login" ? "להרשמה" : "להתחברות"}
          </button>
        </div>
      </div>
    </PageSection>
  );
};
