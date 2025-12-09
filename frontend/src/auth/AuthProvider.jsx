import React, { createContext, useContext, useState, useEffect } from "react";
import api, { attachInterceptors } from "../utils/api"; // IMPORTANT

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

function useProvideAuth() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  async function login(email, password) {
    const res = await api.post(
      "/auth/login",
      { email, password },
      { withCredentials: true, skipAuthRefresh: true }
    );

    const token = res.data.accessToken;
    setAccessToken(token);
    setUser(res.data.user);

    // login must also update api instance
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    return res;
  }

  async function refresh() {
    const res = await api.post("/auth/refresh", {}, { skipAuthRefresh: true });
    const token = res.data.accessToken;
    setAccessToken(token);

    // refresh token must also update api instance
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    return token;
  }

  async function logout() {
    setAccessToken(null);
    setUser(null);

    delete api.defaults.headers.common["Authorization"];
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch (_) {}
  }

  // IMPORTANT → attach interceptors AFTER accessToken changes
  useEffect(() => {
    attachInterceptors({ accessToken, refresh, logout });
  }, [accessToken]);

  return { user, setUser, login, logout, accessToken, setAccessToken, refresh };
}
