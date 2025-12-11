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
  const [initializing, setInitializing] = useState(true);

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
    // call refresh endpoint but mark config to skip interceptor auto-refresh
    try {
      const res = await api.post(
        "/auth/refresh",
        {},
        { skipAuthRefresh: true, withCredentials: true }
      );
      const token = res.data.accessToken;
      const userObj = res.data.user ?? null;
      setAccessToken(token);
      if (userObj) setUser(userObj);

      // also update api instance
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return token;
    } catch (err) {
      // forward error so caller can handle (AuthProvider mount logic will swallow)
      throw err;
    }
  }

  async function logout() {
    setAccessToken(null);
    setUser(null);

    delete api.defaults.headers.common["Authorization"];
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch (_) {}
  }

  // Attach interceptors whenever auth values change
  useEffect(() => {
    attachInterceptors({ accessToken, refresh, logout });
    // note: attachInterceptors is idempotent in our implementation; if not you may need to eject interceptors on unmount
  }, [accessToken]);

  // Restore session ONCE on mount.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // call refresh; refresh() now sets user and accessToken
        await refresh();
      } catch (e) {
        // session restore failed (no cookie or expired) — keep user logged out but do not retry continuously
        console.log(
          "Session restore failed:",
          e?.response?.data ?? e?.message ?? e
        );
      } finally {
        if (mounted) setInitializing(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // run exactly once on mount

  return {
    user,
    setUser,
    login,
    logout,
    accessToken,
    setAccessToken,
    refresh,
    initializing,
  };
}
