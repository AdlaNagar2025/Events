import { useState } from "react";
import classes from "./registerorlogin.module.css";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function getDefaultRouteForRole(role) {
  switch (role) {
    case "Customer":
      return "/account";
    case "Admin":
      return "/admin/users";
    case "Chief":
    case "Hall_Owner":
      return "/provider/dashboard";
    default:
      return "/";
  }
}

export default function Register({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!formData.role) {
      return alert("Please select a role before registering");
    }

    try {
      const response = await axios.post(
        "http://localhost:3030/user/register",
        formData,
        { withCredentials: true },
      );

      if (response.data.success) {
        onLoginSuccess(response.data.user);
        const role = response.data.user?.role;
        if (role === "Chief" || role === "Hall_Owner") {
          navigate("/provider/business");
        } else {
          navigate(getDefaultRouteForRole(role));
        }
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again later.");
    }
  };

  return (
    <form className={classes.form} onSubmit={handleRegisterSubmit}>
      <h2>Create Your Account</h2>
      <p className={classes.subtitle}>
        Join EventHub to manage your events effortlessly
      </p>

      <p className={classes.sectionTitle}>Personal Details</p>

      <div className={classes.nameRow}>
        <div className={classes.fieldGroup}>
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            placeholder="First name"
            value={formData.first_name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className={classes.fieldGroup}>
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            placeholder="Last name"
            value={formData.last_name}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className={classes.fieldGroup}>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className={classes.fieldGroup}>
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          type="tel"
          name="phone"
          placeholder="0501234567"
          pattern="^05[023458]\d{7}$"
          value={formData.phone}
          onChange={handleInputChange}
        />
      </div>

      <div className={classes.fieldGroup}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="Choose a strong password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
      </div>

      <section className={classes.roleSelection}>
        <label>Select Your Role</label>
        <div className={classes.radioGroup}>
          <label>
            <input
              type="radio"
              name="role"
              value="Customer"
              onChange={handleInputChange}
              checked={formData.role === "Customer"}
            />
            Customer
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="Hall_Owner"
              onChange={handleInputChange}
              checked={formData.role === "Hall_Owner"}
            />
            Hall Owner
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="Chief"
              onChange={handleInputChange}
              checked={formData.role === "Chief"}
            />
            Chief
          </label>
        </div>
      </section>

      <button type="submit" className={classes.submitBtn}>
        Sign Up Now
      </button>

      <p className={classes.footerText}>
        Already have an account? <Link to="/auth/login">Log In</Link>
      </p>
    </form>
  );
}
