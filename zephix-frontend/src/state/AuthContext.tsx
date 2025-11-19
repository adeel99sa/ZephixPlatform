import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setTokens, clearTokens, loadTokensFromStorage } from "@/lib/api";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  name?: string; // computed field
};
type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate() {
    loadTokensFromStorage();
    try {
      // API interceptor already unwraps, so response is already the data
      const userData = await api.get("/auth/me");
      // Add computed name field
      const userWithName = {
        ...userData,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      };
      setUser(userWithName);
    } catch (error) {
      console.log('Auth hydration failed:', error);
      // not logged in, continue
    }
    setLoading(false);
  }

  useEffect(() => { hydrate(); }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    // API interceptor unwraps the response, so tokens are at the top level
    setTokens(response.accessToken, response.refreshToken);
    // Add computed name field
    const userWithName = {
      ...response.user,
      name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim()
    };
    setUser(userWithName);
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    clearTokens();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
};
