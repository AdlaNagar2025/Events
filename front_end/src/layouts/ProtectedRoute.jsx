import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ user, loading, allowedRoles }) {
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <Navigate to="/auth/login" replace state={{ from: location }} />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
