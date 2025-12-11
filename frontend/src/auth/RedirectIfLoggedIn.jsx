import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RedirectIfLoggedIn({ children }) {
  const { user } = useAuth();

  // If user exists → redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
