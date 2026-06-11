import { NavLink } from "react-router-dom";
import classes from "./sideBar.module.css";

function getRoleLabel(role) {
  switch (role) {
    case "Hall_Owner":
      return "Hall Owner";
    case "Chief":
      return "Chef";
    default:
      return role;
  }
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? `${classes.link} ${classes.active}` : classes.link
      }
    >
      {children}
    </NavLink>
  );
}

export default function SideBar({ user }) {
  if (!user) return null;

  const roleLabel = getRoleLabel(user.role);
  const isProvider = user.role === "Chief" || user.role === "Hall_Owner";
  const isApproved = user.status === "APPROVED";

  return (
    <aside className={classes.sideBar}>
      <div className={classes.header}>
        <div className={classes.avatar}>
          {user.first_name?.[0]}
          {user.last_name?.[0]}
        </div>
        <div className={classes.userInfo}>
          <span className={classes.userName}>
            {user.first_name} {user.last_name}
          </span>
          <span className={classes.roleBadge}>{roleLabel}</span>
        </div>
      </div>

      <nav className={classes.nav}>
        {user.role === "Customer" && (
          <>
            <p className={classes.sectionLabel}>Customer</p>
            <NavItem to="/customer/find-vendor">Find a Vendor</NavItem>
            <NavItem to="/customer/my-booking">My Booking</NavItem>
            <NavItem to="/customer/favorites">Favorites</NavItem>
          </>
        )}

        {user.role === "Admin" && (
          <>
            <p className={classes.sectionLabel}>Dashboard</p>
            <NavItem to="/admin/users">Users Management</NavItem>
            <NavItem to="/admin/services-approvals">Services Approvals</NavItem>
            <p className={classes.sectionLabel}>Moderation</p>
          </>
        )}

        {isProvider && isApproved && (
          <>
            <p className={classes.sectionLabel}>Provider</p>
            <NavItem to="/provider/dashboard">Dashboard</NavItem>
            <NavItem to="/provider/calendar">Calendar &amp; Bookings</NavItem>
            <NavItem to="/provider/reviews">Clients &amp; Reviews</NavItem>
            <NavItem to="/provider/business">Profile Settings</NavItem>
          </>
        )}

        {isProvider && !isApproved && (
          <div className={classes.statusNotice}>
            <span className={classes.statusDot} />
            Account {user.status?.toLowerCase()} — complete your profile
          </div>
        )}

        <p className={classes.sectionLabel}>Account</p>
        <NavItem to="/account">My Account</NavItem>
        <NavItem to="/notifications">Notifications</NavItem>

        {isProvider && !isApproved && (
          <NavItem to="/provider/business">Profile Settings</NavItem>
        )}
      </nav>

      <div className={classes.footer}>
        <span className={classes.brand}>
          Event<span>Hub</span>
        </span>
      </div>
    </aside>
  );
}
