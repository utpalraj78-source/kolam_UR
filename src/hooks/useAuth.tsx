import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import { getMe } from "@/api/auth";
import { AUTH_EVENT } from "@/utils/authEvents";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("user_role");

    if (!token) {
      setUser(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    // Optimistically set role if available
    if (role) setUserRole(role);

    try {
      const userData = await getMe();
      setUser(userData);
      // Ensure role persists or matches (here we prioritize localstorage for this demo context)
      if (role) setUserRole(role);
    } catch (error) {
      console.error("Auth check failed", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user_role");
      setUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    const handleAuthChange = () => {
      setLoading(true);
      checkAuth();
    };
    window.addEventListener(AUTH_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_EVENT, handleAuthChange);
  }, []);

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");
    window.dispatchEvent(new Event(AUTH_EVENT));
  };

  return { user, userRole, session: null, loading, signOut };
};

