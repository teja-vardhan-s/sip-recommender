import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = useAuth();
  const nav = useNavigate();
  async function submit(e) {
    e.preventDefault();
    try {
      await auth.login(email, password);
      nav("/");
    } catch (err) {
      alert(err.response?.data?.error?.message || "Login failed");
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={submit}
        className="p-6 bg-white shadow rounded w-full max-w-sm"
      >
        <h2 className="text-xl mb-4">Login</h2>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="w-full mb-4 p-2 border rounded"
        />
        <button className="w-full p-2 bg-indigo-600 text-white rounded">
          Login
        </button>
        <div className="text-sm text-slate-600 mt-2">
          Don't have an account?{" "}
          <a href="/signup" className="text-indigo-600">
            Sign up
          </a>
        </div>
      </form>
    </div>
  );
}
