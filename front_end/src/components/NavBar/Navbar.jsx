import { Link } from "react-router-dom";
import classes from "./navbar.module.css";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

export default function Navbar({ user, setUserTo }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await API.get("/user/logout");
    } catch (error) {
      console.error("Logout request error:", error);
    } finally {
      setUserTo(null);
      navigate("/");
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
            <Link to="/auth/register">Register</Link>
            <Link to="/auth/login">Login</Link>
          </>
        ) : (
          <>
            <button onClick={handleLogout} className={classes.logoutBtn}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
