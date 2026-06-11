import { Link } from "react-router-dom";
import classes from "./sideBar.module.css";

export default function SideBar({ user }) {
  return (
    <>
      {user?.role === "Customer" && (
        <div className={classes.sideBar}>
          <Link to="/customer/find-vendor">🔍Find a vendor</Link>
          <Link to="/customer/my-booking">My Booking</Link>
          <Link to="/customer/favorites">❤️favorite</Link>
          <Link to="/account">My Account</Link>
          <Link to="/notifications">Notifications</Link>
        </div>
      )}

      {user?.role === "Admin" && (
        <div className={classes.sideBar}>
          <p>Admin DashBoard</p>
          <Link to="/admin/users">Users Managment</Link>
          <Link to="/admin/services-approvals">Services Approvals</Link>
          <Link to="/account">My Account</Link>
          <Link to="/notifications">Notifications</Link>
          <p>Content Moderation</p>
        </div>
      )}

      {(user?.role === "Chief" || user?.role === "Hall_Owner") &&
        user.status === "APPROVED" && (
          <div className={classes.sideBar}>
            <Link to="/provider/dashboard">DashBoard</Link>
            <Link to="/provider/calendar">Calender && Bookings</Link>
            <Link to="/provider/reviews">Clients && Reviews</Link>
            <Link to="/account">My Account</Link>
            <Link to="/provider/business">Profile Setting</Link>
            <Link to="/notifications">Notifications</Link>
          </div>
        )}

      {(user?.role === "Chief" || user?.role === "Hall_Owner") &&
        (user.status === "DENY" ||
          user.status === "DRAFT" ||
          user.status === "PENDING") && (
          <div className={classes.sideBar}>
            <Link to="/account">My Account</Link>
            <Link to="/provider/business">Profile Setting</Link>
            <Link to="/notifications">Notifications</Link>
          </div>
        )}
    </>
  );
}
