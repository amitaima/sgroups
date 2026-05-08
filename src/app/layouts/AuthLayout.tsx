import { Outlet } from "react-router-dom";
import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import "./AuthLayout.scss";

export const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <PageContainer className="auth-layout__container">
        <Outlet />
      </PageContainer>
    </div>
  );
};
