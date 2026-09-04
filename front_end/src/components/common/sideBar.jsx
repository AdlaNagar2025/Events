import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import API from "../../services/api";
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

function getRoleEndpoint(role) {
  if (role === "Chief" || role === "Hall_Owner") return "provider";
  return role ? role.toLowerCase() : "";
}

function NavItem({ to, children, endContent }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? `${classes.link} ${classes.active}` : classes.link
      }
    >
      <span className={classes.linkText}>{children}</span>
      {endContent}
    </NavLink>
  );
}

export default function SideBar({ user }) {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.role) {
      setUnreadCount(0);
      return;
    }

    const endpointRole = getRoleEndpoint(user.role);
    if (!endpointRole) return;

    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const response = await API.get(`/${endpointRole}/MyNotifications`);
        const list = response.data?.data || [];
        const count = list.filter((n) => Number(n.isRead) === 0).length;
        if (!cancelled) setUnreadCount(count);
      } catch (error) {
        console.error("Error fetching unread notifications:", error);
        if (!cancelled) setUnreadCount(0);
      }
    };

    fetchUnread();
    const intervalId = setInterval(fetchUnread, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user?.role, user?.id, location.pathname]);

  if (!user) return null;

  const roleLabel = getRoleLabel(user.role);
  const isProvider = user.role === "Chief" || user.role === "Hall_Owner";
  const isApproved = user.status === "APPROVED";

  const notificationsBadge =
    unreadCount > 0 ? (
      <span className={classes.badge} aria-label={`${unreadCount} unread`}>
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    ) : null;

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
            <p className={classes.sectionLabel}></p>
            <NavItem to="/admin/dashboard">Dashboard</NavItem>
            <NavItem to="/admin/users">Users Management</NavItem>
            <NavItem to="/admin/services-approvals">Services Approvals</NavItem>
            <NavItem to="/admin/content-moderation">Content Moderation</NavItem>
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
        <NavItem
          to="/notifications"
          endContent={
            <span className={classes.notifMeta}>
              <FaBell className={classes.bellIcon} aria-hidden="true" />
              {notificationsBadge}
            </span>
          }
        >
          Notifications
        </NavItem>

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
