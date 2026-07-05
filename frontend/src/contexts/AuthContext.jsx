import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("crp_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("crp_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("crp_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    await api.post("/auth/register", payload);
    return login(payload.email, payload.password);
  };

  const logout = () => {
    localStorage.removeItem("crp_token");
    setUser(null);
    window.location.href = "/login";
  };

  const updateUser = (u) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
