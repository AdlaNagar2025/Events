import { useState } from "react";
import classes from "./registerorlogin.module.css";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
/**
 * Register Component - מאפשר למשתמשים חדשים להצטרף למערכת לפי תפקיד נבחר.
 * מטפל באיסוף הנתונים, הצפנתם (בצד שרת) והפניה לדף החשבון לאחר הצלחה.
 */
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
  /**
   * handleInputChange - מעדכנת את ה-State המקומי בכל שינוי בשדות הטופס.
   * פועלת באופן דינמי על פי מאפיין ה-name של ה-input.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * handleRegisterSubmit - שולחת את נתוני המשתמש החדש לשרת ליצירת חשבון.
   * במידה והרישום הצליח, המערכת מבצעת כניסה אוטומטית (Login) ומעבירה לדף החשבון.
   */
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    // בדיקה בסיסית שחובה לבחור תפקיד
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
        if (response.data.user?.role === "Customer" || response.data.user?.role==="Admin") {
          // עדכון המצב הגלובלי באפליקציה
          navigate("/account");
        } else if (
          response.data.user?.role === "Chief" ||
          response.data.user?.role === "Hall_Owner"
        ) {
          navigate("/businessAccount");
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
        <p>Join EventHub to manage your events effortlessly</p>
        <h3>Personal Details</h3>
        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={formData.first_name}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={formData.last_name}
          onChange={handleInputChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone (e.g. 0501234567)"
          pattern="^05[023458]\d{7}$"
          value={formData.phone}
          onChange={handleInputChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Choose a Password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
        <section className={classes.roleSelection}>
          <label>Select Your Role:</label>
          <div className={classes.radioGroup}>
            <input
              type="radio"
              name="role"
              value="Customer"
              onChange={handleInputChange}
              checked={formData.role === "Customer"}
            />
            Customer
            <input
              type="radio"
              name="role"
              value="Hall_Owner"
              onChange={handleInputChange}
              checked={formData.role === "Hall_Owner"}
            />
            Hall_Owner
            <input
              type="radio"
              name="role"
              value="Chief"
              onChange={handleInputChange}
              checked={formData.role === "Chief"}
            />
            Chief
          
          </div>
        </section>
        <button type="submit" className={classes.submitBtn}>
          Sign Up Now
        </button>
        <p>
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </form>

  );
}
