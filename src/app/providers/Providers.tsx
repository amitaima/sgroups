import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@app/providers/AuthProvider";
import { ThemeProvider } from "@app/providers/ThemeProvider";
import { router } from "@app/router/router";

interface ProvidersProps {
  children?: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
};
