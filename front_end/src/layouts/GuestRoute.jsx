import { Navigate, Outlet } from "react-router-dom";

function getDefaultRouteForRole(role) {
  switch (role) {
    case "Customer":
      return "/customer/find-vendor";
    case "Admin":
      return "/admin/users";
    case "Chief":
    case "Hall_Owner":
      return "/provider/dashboard";
    default:
      return "/";
  }
}

export default function GuestRoute({ user, loading }) {
  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <Outlet />;
}
