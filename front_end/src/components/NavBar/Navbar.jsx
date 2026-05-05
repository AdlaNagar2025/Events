import { Link } from "react-router-dom";
import classes from "./navbar.module.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";


export default function Navbar({ user, setUserTo }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await axios.get("http://localhost:3030/user/logout", {
        withCredentials: true,
      });
      if (response.data.success) {
        setUserTo(null); // איפס ה-State
        navigate("/"); // חזרה לדף הבית
      }
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  return (
    <nav className={classes.nav}>

      <div className={classes.navLinks}>
        {!user ? (
          <>
            <Link to="/" className={classes.logo}>
              EventHub
            </Link>
            <Link to="/register">Register</Link>
            <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            {user && (
              <button onClick={handleLogout} className={classes.logoutBtn}>
                Logout
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
