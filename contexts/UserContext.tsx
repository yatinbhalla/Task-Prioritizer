import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

const USER_KEY = "priority_pulse_user";

export interface UserProfile {
  name: string;
  email?: string;
  createdAt: string;
}

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  saveUser: (profile: Omit<UserProfile, "createdAt">) => Promise<void>;
  clearUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const saveUser = useCallback(async (profile: Omit<UserProfile, "createdAt">) => {
    const full: UserProfile = { ...profile, createdAt: new Date().toISOString() };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(full));
    setUser(full);
  }, []);

  const clearUser = useCallback(async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, saveUser, clearUser }), [user, isLoading, saveUser, clearUser]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
