import { useState } from "react";
import classes from "./registerorlogin.module.css";
import API from "../../services/api";
import { Link, useNavigate } from "react-router-dom";

function getDefaultRouteForRole(user) {
  if (!user) return "/";
  switch (user.role) {
    case "Customer":
      return "/account";
    case "Admin":
      return "/admin/users";
    case "Chief":
    case "Hall_Owner":
      if (user.status === "DRAFT" || user.status === "PENDING") {
        return "/provider/business";
      }
      return "/provider/dashboard";
    default:
      return "/";
  }
}

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/user/login", credentials);
      if (response.data.success) {
        onLoginSuccess(response.data.user);
        navigate(getDefaultRouteForRole(response.data.user));
      } else {
        setError(response.data.message || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Login Error:", err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={classes.form} onSubmit={handleLoginSubmit}>
      <h2>Welcome Back</h2>
      <p className={classes.subtitle}>Sign in to your EventHub account</p>

      {error && (
        <div className={classes.errorAlert} role="alert">
          <span className={classes.errorIcon} aria-hidden="true">
            !
          </span>
          <div className={classes.errorContent}>
            <strong>Login failed</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className={classes.errorDismiss}
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <p className={classes.sectionTitle}>Login Details</p>

      <div className={classes.fieldGroup}>
        <label htmlFor="login-email">Email Address</label>
        <input
          id="login-email"
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          value={credentials.email}
          onChange={handleInputChange}
        />
      </div>

      <div className={classes.fieldGroup}>
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          name="password"
          placeholder="Enter your password"
          required
          value={credentials.password}
          onChange={handleInputChange}
          className={error ? classes.inputError : ""}
        />
      </div>

      <button type="submit" className={classes.loginBtn} disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className={classes.footerText}>
        Don&apos;t have an account? <Link to="/auth/register">Sign Up</Link>
      </p>
    </form>
  );
}
