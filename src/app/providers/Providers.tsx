import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@app/providers/AuthProvider";
import { router } from "@app/router/router";

interface ProvidersProps {
  children?: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <AuthProvider>
      {children}
      <RouterProvider router={router} />
    </AuthProvider>
  );
};
