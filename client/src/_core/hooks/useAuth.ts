import { useEffect, useState } from "react";
import { authAPI } from "@/lib/api";

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getMe();
        const userData = response.data;
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = "/api/dev/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    logout,
  };
}
