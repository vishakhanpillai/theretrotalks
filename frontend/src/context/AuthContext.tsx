import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const ADMIN_TOKEN_KEY = "the_retro_talks_admin_token";

export interface AuthContextType {
  adminToken: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(adminToken));

  // Verify Admin Token on mount or when adminToken changes
  useEffect(() => {
    if (!adminToken) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch("/api/admin/status", {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Status check failed");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          try {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
          } catch {}
          setAdminToken(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Admin status verification failed:", err);
        setIsAdmin(false);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [adminToken]);

  const setToken = useCallback((token: string) => {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch {}
    setAdminToken(token);
    setIsAdmin(true);
  }, []);

  const login = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.token) {
        return {
          success: false,
          error: data.error || "Incorrect admin passcode. Access denied.",
        };
      }

      setToken(data.token);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication network failure";
      return { success: false, error: message };
    }
  }, [setToken]);

  const logout = useCallback(async () => {
    const currentToken = adminToken;
    if (currentToken) {
      try {
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch (err) {
        console.warn("Logout error:", err);
      }
    }

    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {}
    setAdminToken(null);
    setIsAdmin(false);
  }, [adminToken]);

  const value: AuthContextType = {
    adminToken,
    isAdmin,
    isLoading,
    login,
    logout,
    setToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
