import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "organiser" | "attendee";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { session, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
