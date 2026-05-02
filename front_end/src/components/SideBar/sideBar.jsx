import { Link } from "react-router-dom";
import classes from "./sideBar.module.css";

export default function SideBar({ user }) {
  
  return (
    <>
      {user?.role === "Customer" && (
        <div className={classes.sideBar}>
          <Link to="/findavendor">🔍Find a vendor</Link>
          {/* <Link to="/allApprovedServices">Vendors</Link> */}
          <Link to="/bookEvent">BooK Event Team </Link>
          {/* <Link to="/servicesapprovals">Services Approvals</Link> */}
          <p>My Booking</p>
          <p>❤️favorite</p>
          <Link to="/account">My Account</Link>
          <p>✏️Write a review</p>
        </div>
      )}
      {user?.role === "Admin" && (
        <div className={classes.sideBar}>
          <p>Admin DashBoard</p>
          <Link to="/usersmanagment">Users Managment</Link>
          <Link to="/servicesapprovals">Services Approvals</Link>
          <Link to="/account">My Account</Link>
          <p>Content Moderation</p>
        </div>
      )}

      {(user?.role === "Chief" || user?.role === "Hall_Owner") && (
        <div className={classes.sideBar}>
          <p>DashBoard</p>
          <p>Calender && Bookings</p>
          <p>Clients && Reviews</p>
          <Link to="/account">My Account</Link>
          <Link to="/businessAccount">Profile Setting</Link>
        </div>
      )}
    </>
  );
}
