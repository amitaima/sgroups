import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, upsertUserProfile } from "@services/firebase/firebase";

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);

      if (nextUser) {
        void upsertUserProfile(nextUser).catch((error) => {
          console.error("Failed to sync user profile", error);
        });
      }
    });

    return unsubscribe;
  }, []);

  const signOutUser = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      signOutUser,
    }),
    [user, initializing, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
