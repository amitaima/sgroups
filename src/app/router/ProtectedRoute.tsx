import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@app/providers/AuthProvider";
import "./ProtectedRoute.scss";

export const ProtectedRoute = () => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="auth-gate">
        <div className="auth-gate__card">טוען נתוני התחברות...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
