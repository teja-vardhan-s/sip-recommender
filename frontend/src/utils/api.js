import axios from "axios";
import { useAuth } from "../auth/AuthProvider";


const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const instance = axios.create({
    baseURL,
    withCredentials: true, // important so refresh cookie is sent
    headers: { "Content-Type": "application/json" },
});

// we cannot access React state here, so export a factory that accepts auth hooks
export function attachInterceptors(auth) {
    // attach token to header
    instance.interceptors.request.use(config => {
        if (auth?.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
        return config;
    });

    instance.interceptors.response.use(
        r => r,
        async (error) => {
            const original = error.config;
            if (!original || original._retry) return Promise.reject(error);

            // If 401 from expired access token -> try refresh
            if (error.response && error.response.status === 401) {
                original._retry = true;
                try {
                    const newToken = await auth.refresh(); // calls /auth/refresh (cookie)
                    instance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    original.headers['Authorization'] = `Bearer ${newToken}`;
                    return instance(original);
                } catch (e) {
                    if (err.response?.data?.error?.message === "REFRESH_TOKEN_EXPIRED") {
                        auth.logout();
                        return Promise.reject(err);
                    }
                }
            }
            return Promise.reject(error);
        }
    );
}

export default instance;
