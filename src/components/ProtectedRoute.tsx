import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "organiser" | "attendee";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { session, roles, loading } = useAuth();
  const location = useLocation();

  if (loading && !session && roles.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <span className="text-xs font-mono font-medium text-muted-foreground">Loading workspace...</span>
      </div>
    );
  }

  if (!session && !loading) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Prevent premature redirect while roles are being fetched
  if (requiredRole && !loading && !roles.includes(requiredRole) && !roles.includes("admin")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
