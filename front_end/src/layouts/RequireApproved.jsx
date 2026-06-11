import { Navigate, Outlet } from "react-router-dom";

export default function RequireApproved({ user }) {
  const isProvider = user?.role === "Chief" || user?.role === "Hall_Owner";

  if (isProvider && user.status !== "APPROVED") {
    return <Navigate to="/provider/business" replace />;
  }

  return <Outlet />;
}
