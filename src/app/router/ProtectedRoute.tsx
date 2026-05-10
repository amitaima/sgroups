import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@app/providers/AuthProvider";
import logo from "@assets/images/logo.svg";
import "./ProtectedRoute.scss";

export const ProtectedRoute = () => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="auth-gate">
        <div className="auth-gate__card">
          <div className="auth-gate__logo" aria-hidden>
            <img src={logo} alt="" />
          </div>
          <div className="auth-gate__message">טוען נתוני התחברות...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
