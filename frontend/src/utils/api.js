// src/utils/api.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const instance = axios.create({
    baseURL,
    withCredentials: true, // important so refresh cookie is sent
    headers: { "Content-Type": "application/json" },
});

/**
 * attachInterceptors(auth)
 * - auth must provide: accessToken (string), refresh() -> Promise<string|null>, logout()
 *
 * Behavior:
 * - attaches access token to requests
 * - on 401 (and not skipAuthRefresh) it will run a single refresh and then retry original request
 */
export function attachInterceptors(auth) {
    // single-flight refresh handling
    let isRefreshing = false;
    let refreshPromise = null;
    let pendingRequests = []; // functions to resume pending requests

    // Request interceptor: attach access token if present
    instance.interceptors.request.use((config) => {
        config.headers = config.headers || {};
        if (auth?.accessToken) {
            config.headers.Authorization = `Bearer ${auth.accessToken}`;
        }
        return config;
    });

    // Response interceptor
    instance.interceptors.response.use(
        (res) => res,
        async (error) => {
            const original = error?.config;
            if (!original) return Promise.reject(error);

            // Do not try refresh for requests that explicitly opted out
            if (original.skipAuthRefresh) return Promise.reject(error);

            // Already retried once? bail out to avoid loops
            if (original._retry) return Promise.reject(error);

            // Only handle 401
            const status = error?.response?.status;
            if (status !== 401) return Promise.reject(error);

            // mark retry to avoid double-retry
            original._retry = true;

            // If a refresh is already in-flight, wait for it and then retry original
            if (isRefreshing) {
                try {
                    await refreshPromise; // wait for the outstanding refresh to complete
                    // attach new token (auth.refresh should have stored it in auth.accessToken)
                    if (auth?.accessToken) {
                        original.headers = original.headers || {};
                        original.headers.Authorization = `Bearer ${auth.accessToken}`;
                    }
                    return instance(original);
                } catch (e) {
                    // refresh failed — ensure logout
                    auth?.logout?.();
                    return Promise.reject(e);
                }
            }

            // No refresh in flight -> start one
            isRefreshing = true;
            refreshPromise = (async () => {
                try {
                    const newToken = await auth.refresh(); // THIS call must use skipAuthRefresh on the request from inside auth.refresh
                    // If refresh returns token, update axios defaults
                    if (newToken) {
                        instance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
                        // resolve pending requests
                        pendingRequests.forEach((cb) => cb(null, newToken));
                        pendingRequests = [];
                        return newToken;
                    } else {
                        // no token means logout
                        throw new Error("No token from refresh");
                    }
                } catch (err) {
                    // reject pending requests
                    pendingRequests.forEach((cb) => cb(err));
                    pendingRequests = [];
                    throw err;
                } finally {
                    isRefreshing = false;
                    refreshPromise = null;
                }
            })();

            try {
                await refreshPromise;
                // retry original
                if (auth?.accessToken) {
                    original.headers = original.headers || {};
                    original.headers.Authorization = `Bearer ${auth.accessToken}`;
                }
                return instance(original);
            } catch (refreshErr) {
                // refresh failed; ensure logout
                auth?.logout?.();
                return Promise.reject(refreshErr);
            }
        }
    );

    // allow callers to add requests to the pending queue while refresh is in progress
    function queueRequest() {
        return new Promise((resolve, reject) => {
            pendingRequests.push((err, token) => {
                if (err) return reject(err);
                resolve(token);
            });
        });
    }

    // optional: expose queue function to callers
    instance._queueRequestDuringRefresh = queueRequest;
}

export default instance;
