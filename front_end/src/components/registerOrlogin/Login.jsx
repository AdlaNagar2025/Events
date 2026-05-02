import { useState } from "react";
import classes from "./registerorlogin.module.css";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
/**
 * Login Component - מטפל באימות משתמשים קיימים והפנייתם לאזור האישי.
 */
export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  /**
   * handleInputChange - מעדכנת את ה-State בכל שינוי באחד משדות הקלט (Input).
   * פונקציה גנרית המשתמשת במאפיין ה-name של השדה כדי לעדכן את הערך המתאים.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };
  /**
   * handleLoginSubmit - שולחת בקשת POST לשרת לאימות הפרטים.
   * במקרה של הצלחה: מעדכנת את ה-State של האפליקציה, שומרת Session ועוברת לדף החשבון.
   */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:3030/user/login",
        credentials,
        { withCredentials: true }, 
      );
      if (response.data.success) {
        onLoginSuccess(response.data.user);
        if (response.data.user?.role === "Customer") {
          navigate("/account");
        } else if (
          response.data.user?.role === "Chief" ||
          response.data.user?.role === "Hall_Owner"
        ) {
          navigate("/businessAccount");
        }
        else if(
          response.data.user?.role === "Admin"
        )
         navigate("/account");
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Login Error:", error);

      if (error.response && error.response.data) {
        alert(error.response.data.message || "Access denied");
      } else {
        alert("An error occurred during login. Please try again.");
      }
    }
  };

  return (
      <form className={classes.form} onSubmit={handleLoginSubmit}>
        <h2>Welcome Back</h2>
        <p>Sign in to your EventHub account</p>
        <h3>Login Details</h3>
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          required
          value={credentials.email}
          onChange={handleInputChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          value={credentials.password}
          onChange={handleInputChange}
        />
        <button type="submit" className={classes.loginBtn}>
          Sign In
        </button>
        <p>
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </form>
  
  );
}
