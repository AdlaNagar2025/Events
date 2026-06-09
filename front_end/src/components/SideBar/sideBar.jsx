import { Link } from "react-router-dom";
import classes from "./sideBar.module.css";

export default function SideBar({ user }) {
  console.log("", user, "i am in sideBar");
  return (
    <>
      {user?.role === "Customer" && (
        <div className={classes.sideBar}>
          <Link to="/findavendor">🔍Find a vendor</Link>
          {/* <Link to="/allApprovedServices">Vendors</Link> */}
          {/* <Link to="/bookEvent">BooK Event Team </Link> */}
          <Link to="/myBooking">My Booking</Link>
          {/* <p>My Booking</p> */}
          <Link to="/MyFavoriteProviders">❤️favorite</Link>

          <Link to="/account">My Account</Link>
          <Link to="/Notifications">Notifications</Link>
        </div>
      )}
      {user?.role === "Admin" && (
        <div className={classes.sideBar}>
          <p>Admin DashBoard</p>
          <Link to="/usersmanagment">Users Managment</Link>
          <Link to="/servicesapprovals">Services Approvals</Link>
          <Link to="/account">My Account</Link>
          <Link to="/Notifications">Notifications</Link>
          <p>Content Moderation</p>
        </div>
      )}

      {(user?.role === "Chief" || user?.role === "Hall_Owner") &&
        user.status === "APPROVED" && (
          <div className={classes.sideBar}>
            <Link to="/myDashboard">DashBoard</Link>
            <Link to="/myEventsAndCalendar">Calender && Bookings</Link>
            <Link to="/myCommentsAndReviews">Clients && Reviews</Link>
            <Link to="/account">My Account</Link>
            <Link to="/businessAccount">Profile Setting</Link>
            <Link to="/Notifications">Notifications</Link>
          </div>
        )}

      {(user?.role === "Chief" || user?.role === "Hall_Owner") &&
        (user.status === "DENY" ||
          user.status === "DRAFT" ||
          user.status === "PENDING") && (
          <div className={classes.sideBar}>
            <Link to="/account">My Account</Link>
            <Link to="/businessAccount">Profile Setting</Link>
            <Link to="/Notifications">Notifications</Link>
          </div>
        )}
    </>
  );
}
