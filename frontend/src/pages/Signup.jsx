import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../auth/AuthProvider";

export default function Signup() {
  const auth = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    risk_profile: "Balanced", // default
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Name is required");
    if (!form.email.includes("@")) return setError("Enter a valid email");
    if (form.password.length < 6)
      return setError("Password must be 6+ characters");
    if (form.password !== form.confirm)
      return setError("Passwords do not match");

    setLoading(true);
    try {
      // POST to backend signup endpoint. Adjust path if needed.
      const res = await api.post(
        "/auth/signup",
        {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          risk_profile: form.risk_profile,
        },
        { withCredentials: true } // so refresh cookie can be set by server
      );

      // Expect backend to return accessToken and user
      const accessToken = res.data?.accessToken ?? res.data?.access_token;
      const user = res.data?.user ?? res.data?.data ?? null;

      if (!accessToken || !user) {
        // If backend signs user in but uses different shape, you can try other fields.
        // For now handle gracefully:
        setError("Signup succeeded but unexpected response. Please login.");
        setLoading(false);
        return;
      }

      // Update global auth state
      auth.setAccessToken?.(accessToken);
      auth.setUser?.(user);

      // also set axios default Authorization header (AuthProvider normally does this on login)
      // important because other API calls rely on that header
      // eslint-disable-next-line no-unused-expressions
      (await import("axios")).default.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${accessToken}`;

      // redirect to dashboard
      nav("/");
    } catch (e) {
      alert("Signup failed. " + (e?.response?.data?.message || e.message));
      console.error("Signup error:", e);
      const msg =
        e?.response?.data?.error?.message ??
        e?.response?.data?.message ??
        e?.message ??
        "Signup failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Create an account</h2>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Full name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className="w-full border p-2 rounded"
            placeholder="Your full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            className="w-full border p-2 rounded"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              className="w-full border p-2 rounded"
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirm</label>
            <input
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={onChange}
              className="w-full border p-2 rounded"
              placeholder="Repeat password"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Risk profile</label>
          <select
            name="risk_profile"
            value={form.risk_profile}
            onChange={onChange}
            className="w-full border p-2 rounded"
          >
            <option>Conservative</option>
            <option>Balanced</option>
            <option>Aggressive</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600">
              Login
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            {loading ? "Creating..." : "Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}
